import os
from groq import Groq
from dotenv import load_dotenv

# Load your existing .env file
load_dotenv()

# Initialize the client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def list_supported_models():
    print("--- Checking Groq Model Access ---")
    try:
        models = client.models.list()
        found_any = False

        # We check for 'embed' for vector models,
        # but also print all available models just in case the naming is different.
        for model in models.data:
            if "embed" in model.id.lower():
                print(f"✅ FOUND EMBEDDING MODEL: {model.id}")
                found_any = True
            else:
                # This helps you see what chat models you can use for generation
                print(f"   Available Chat Model: {model.id}")

        if not found_any:
            print("\n❌ NO EMBEDDING MODELS FOUND.")
            print("Tip: If you only see chat models, your tier might not have Embedding API access yet.")

    except Exception as e:
        print(f"❌ Error connecting to Groq: {e}")


if __name__ == "__main__":
    list_supported_models()