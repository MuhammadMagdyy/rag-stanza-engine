import os
import shutil
from typing import List
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import inngest
import inngest.fast_api
import groq
from dotenv import load_dotenv

# Your custom logic helpers
from data_loader import load_and_chunk_pdf, embed_texts_stanza
from vector_db import StanzaVectorDB

load_dotenv()

app = FastAPI(title="Stanza Studio API")

app.add_middleware(
    CORSMiddleware,
    # We update the origins to match the 192.168.1.34 IP from your terminal
    allow_origins=[
        "http://localhost:3000",
        "http://192.168.1.34:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Clients
vdb = StanzaVectorDB()
client = groq.Groq(api_key=os.getenv("GROQ_API_KEY"))
inngest_client = inngest.Inngest(app_id="stanza_studio", is_production=False)


class QueryRequest(BaseModel):
    question: str


# --- FUNCTION 1: INGESTION ---
@inngest_client.create_function(
    fn_id="ingest_pdf",
    trigger=inngest.TriggerEvent(event="stanza/ingest_pdf"),
)
async def process_pdf(ctx: inngest.Context):
    pdf_path = ctx.event.data.get("pdf_path")
    filename = ctx.event.data.get("filename", "unknown.pdf")

    chunks = await ctx.step.run("chunk_pdf", lambda: load_and_chunk_pdf(pdf_path))
    embeddings = await ctx.step.run("generate_embeddings", lambda: embed_texts_stanza(chunks))

    # Wrapped to return a simple string to avoid serialization errors
    await ctx.step.run("upsert_to_qdrant", lambda: (
        vdb.upsert(
            texts=chunks,
            embeddings=embeddings,
            metadata=[{"source": filename} for _ in chunks]
        ),
        "success"
    )[1])

    return {"status": "success", "file": filename}


# --- FUNCTION 2: QUERY ARCHIVE (TESTABLE IN INNGEST) ---
@inngest_client.create_function(
    fn_id="query_archive",
    trigger=inngest.TriggerEvent(event="stanza/query_archive"),
)
async def query_archive_task(ctx: inngest.Context):
    question = ctx.event.data.get("question")

    # Step 1: Embed (Returns a list/array)
    vector = await ctx.step.run("embed_question", lambda: embed_texts_stanza([question])[0])

    # Step 2: Search Qdrant & Serialize (FIX: Convert ScoredPoint to Dict)
    def search_and_serialize():
        points = vdb.search(vector, limit=3)
        return [
            {"text": p.payload.get("text", ""), "source": p.payload.get("source", "unknown")}
            for p in points if hasattr(p, 'payload')
        ]

    serialized_points = await ctx.step.run("search_vdb", search_and_serialize)

    # Step 3: Format Context
    context = "\n--\n".join([p["text"] for p in serialized_points])

    if not context.strip():
        return {"answer": "I couldn't find any relevant information in the archive."}

    # Step 4: Get Answer from Groq (FIX: Return only the string content)
    def get_text_answer():
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are Stanza Studio. Answer based on the context provided."},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
            ]
        )
        # We return ONLY the string so Inngest can serialize it
        return completion.choices[0].message.content

    answer_text = await ctx.step.run("get_llm_answer", get_text_answer)

    return {"answer": answer_text}


# --- API ENDPOINTS (For Frontend) ---
@app.post("/api/upload")
async def upload(files: List[UploadFile] = File(...)):
    if not os.path.exists("stanzas_archive"):
        os.makedirs("stanzas_archive")

    for file in files:
        path = os.path.join("stanzas_archive", file.filename)
        with open(path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        await inngest_client.send(inngest.Event(
            name="stanza/ingest_pdf",
            data={"pdf_path": os.path.abspath(path), "filename": file.filename}
        ))
    return {"status": "queued"}


@app.post("/api/query")
async def query(request: QueryRequest):
    try:
        vector = embed_texts_stanza([request.question])[0]
        points = vdb.search(vector, limit=5)

        # Consistent extraction logic
        context_list = [p.payload.get("text", "") for p in points if hasattr(p, 'payload')]
        context = "\n--\n".join(context_list)

        if not context:
            return {"answer": "Archive is currently empty."}

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are Stanza Studio, an expert visual archiver."},
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {request.question}"}
            ]
        )
        return {"answer": completion.choices[0].message.content}
    except Exception as e:
        print(f"Query Error: {e}")
        return {"answer": f"System Error: {str(e)}"}


# Register both functions
inngest.fast_api.serve(app, inngest_client, [process_pdf, query_archive_task])

if __name__ == "__main__":
    import uvicorn
    # Changing host to 0.0.0.0 allows the server to be found at 192.168.1.34
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)