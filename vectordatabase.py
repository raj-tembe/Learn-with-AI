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

def pdf_db_creator(file_path):
    loader = PyPDFLoader(file_path)
    pdf_documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    pdf_docs = text_splitter.split_documents(pdf_documents)

    pdf_db = Chroma.from_documents(pdf_docs, embeddings) 
    return pdf_db 

def text_db_creator(file_path):
    loader = TextLoader(file_path)
    text_documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    text_docs = text_splitter.split_documents(text_documents)

    text_db = Chroma.from_documents(text_docs, embeddings) 
    return text_db

def csv_db_creator(file_path):
    loader = CSVLoader(file_path)
    csv_documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    csv_docs = text_splitter.split_documents(csv_documents)

    csv_db = Chroma.from_documents(csv_docs, embeddings) 
    return csv_db

def json_db_creator(file_path):
    loader = JSONLoader(file_path, jq_schema=".[]")
    json_documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    json_docs = text_splitter.split_documents(json_documents)

    json_db = Chroma.from_documents(json_docs, embeddings) 
    return json_db

def wiki_db_creator(wiki_url):  
    loader = BeautifulSoupWebLoader(wiki_url, soup_strainer=SoupStrainer("p"))
    wiki_documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    wiki_docs = text_splitter.split_documents(wiki_documents)

    wiki_db = Chroma.from_documents(wiki_docs, embeddings) 
    return wiki_db