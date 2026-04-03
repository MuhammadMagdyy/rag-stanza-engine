from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance


class StanzaVectorDB:
    def __init__(self, collection_name="stanzas"):
        self.client = QdrantClient("localhost", port=6333)
        self.collection_name = collection_name

        # Check if collection exists
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == collection_name for c in collections)

            # If it exists with the wrong dimension (768), we must delete and recreate it
            if exists:
                info = self.client.get_collection(collection_name)
                current_dim = info.config.params.vectors.size
                if current_dim != 384:
                    print(f"Dimension mismatch (Found {current_dim}, need 384). Recreating collection...")
                    self.client.delete_collection(collection_name)
                    exists = False

            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    # CHANGED FROM 768 TO 384
                    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
                )
        except Exception as e:
            print(f"Qdrant Init Error: {e}")

    def upsert(self, texts, embeddings, metadata):
        points = [
            PointStruct(
                id=i + (hash(texts[i]) % 10 ** 10),
                vector=embeddings[i],
                payload={"text": texts[i], **metadata[i]}
            ) for i in range(len(texts))
        ]
        self.client.upsert(collection_name=self.collection_name, points=points)

    def search(self, vector, limit=5):
        result = self.client.query_points(
            collection_name=self.collection_name,
            query=vector,
            limit=limit
        )
        return result.points