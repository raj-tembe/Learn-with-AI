from langchain_community.vectorstores import Chroma

from langchain_huggingface import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    CSVLoader,
    JSONLoader,
    WebBaseLoader   # BeautifulSoupWebLoader
)

# from bs4 import SoupStrainer



# file should be uploaded to the server before calling these functions
# 

def load_pdf(file_path):
    loader = PyPDFLoader(file_path)
    docs = loader.load()

    for doc in docs:
        doc.metadata["source"] = file_path
        doc.metadata["source_type"] = "pdf"

    return docs 

def load_text(file_path):
    loader = TextLoader(file_path)
    docs = loader.load()

    for doc in docs:
        doc.metadata["source"] = file_path
        doc.metadata["source_type"] = "text"

    return docs


def load_csv(file_path):
    loader = CSVLoader(file_path)
    docs = loader.load()

    for doc in docs:
        doc.metadata["source"] = file_path
        doc.metadata["source_type"] = "csv"

    return docs


def load_json(file_path):
    import json
    try:
        # First, try to validate the JSON file
        with open(file_path, 'r', encoding='utf-8') as f:
            json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON file {file_path}: {str(e)}")
    
    # If valid, use JSONLoader with correct jq schema
    # Use "." to load the entire JSON, or "[].field" for arrays
    try:
        loader = JSONLoader(file_path, jq_schema=".")
        docs = loader.load()
    except Exception as e:
        # Fallback: try to load as array
        try:
            loader = JSONLoader(file_path, jq_schema=".[]")
            docs = loader.load()
        except Exception:
            raise ValueError(f"Could not parse JSON file {file_path}: {str(e)}")

    for doc in docs:
        doc.metadata["source"] = file_path
        doc.metadata["source_type"] = "json"

    return docs


def load_wiki(wiki_url):
    loader = WebBaseLoader(
        wiki_url
        # soup_strainer=SoupStrainer("p")
    )
    docs = loader.load()

    for doc in docs:
        doc.metadata["source"] = wiki_url
        doc.metadata["source_type"] = "wiki"

    return docs


def ingest_documents(
    pdf_files=None,
    text_files=None,
    csv_files=None,
    json_files=None,
    wiki_links=None,
    persist_dir="learn_with_ai_db"
):
    all_documents = []

    pdf_files = pdf_files or []
    text_files = text_files or []
    csv_files = csv_files or []
    json_files = json_files or []
    wiki_links = wiki_links or []

    for pdf in pdf_files:
        try:
            all_documents.extend(load_pdf(pdf))
        except Exception as e:
            raise ValueError(f"Error loading PDF {pdf}: {str(e)}")

    for txt in text_files:
        try:
            all_documents.extend(load_text(txt))
        except Exception as e:
            raise ValueError(f"Error loading text file {txt}: {str(e)}")

    for csv in csv_files:
        try:
            all_documents.extend(load_csv(csv))
        except Exception as e:
            raise ValueError(f"Error loading CSV file {csv}: {str(e)}")

    for js in json_files:
        try:
            all_documents.extend(load_json(js))
        except Exception as e:
            raise ValueError(f"Error loading JSON file {js}: {str(e)}")

    for link in wiki_links:
        try:
            all_documents.extend(load_wiki(link))
        except Exception as e:
            raise ValueError(f"Error loading wiki link {link}: {str(e)}")

    # Split ALL documents together
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = splitter.split_documents(all_documents)

    # Create ONE vector DB
    db = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=persist_dir
    )

    return db
