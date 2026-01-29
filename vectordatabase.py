from langchain_community.vectorstores import Chroma

from langchain_community.embeddings import HuggingFaceEmbeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

from langchain_community.text_splitter import RecursiveCharacterTextSplitter 

from langchain_community.document_loaders import PyPDFLoader
from langchain_community.document_loaders import TextLoader
from langchain_community.document_loaders import CSVLoader

from bs4 import SoupStrainer
from langchain_community.document_loaders import BeautifulSoupWebLoader


# file should be uploaded to the server before calling these functions

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
    loader = JSONLoader(file_path, jq_schema=".[]")
    docs = loader.load()

    for doc in docs:
        doc.metadata["source"] = file_path
        doc.metadata["source_type"] = "json"

    return docs


def load_wiki(wiki_url):
    loader = BeautifulSoupWebLoader(
        wiki_url,
        soup_strainer=SoupStrainer("p")
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
        all_documents.extend(load_pdf(pdf))

    for txt in text_files:
        all_documents.extend(load_text(txt))

    for csv in csv_files:
        all_documents.extend(load_csv(csv))

    for js in json_files:
        all_documents.extend(load_json(js))

    for link in wiki_links:
        all_documents.extend(load_wiki(link))

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
