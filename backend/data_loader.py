import os
from fastembed import TextEmbedding
from llama_index.readers.file import PDFReader
from llama_index.core.node_parser import SentenceSplitter

# Path to store the ONNX model locally in your project
cache_path = "./local_cache"
embed_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5", cache_dir=cache_path)
splitter = SentenceSplitter(chunk_size=800, chunk_overlap=150)


def load_and_chunk_pdf(path: str):
    try:
        reader = PDFReader()
        docs = reader.load_data(file=path)
        full_text = " ".join([d.text for d in docs if hasattr(d, "text")])
        if not full_text.strip(): return []

        chunks = splitter.split_text(full_text)
        print(f"📦 Stanza Created: {len(chunks)} chunks from {os.path.basename(path)}")
        return chunks
    except Exception as e:
        print(f"❌ Load Error: {e}")
        return []


def embed_texts_stanza(texts: list[str]) -> list[list[float]]:
    if not texts: return []
    embeddings = list(embed_model.embed(texts))
    return [e.tolist() for e in embeddings]