#main RAG chain


# Load environment variables
from dotenv import load_dotenv
load_dotenv()
import os 
os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")
os.environ["LANGCHAIN_TRACKING_V2"] = "true"


# Import necessary modules
from langchain_cores.prompts import PromptTemplate
from langchain_cores.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenAI
from tones import prof_tone, informal_tone, default_tone, encouraging_tone, PROMPT_MAP, LEVELS
from vectordatabase import db 


chosen_tone = input() #get user input from UI through toggle button; else  use "default"
level = input() #get user input from UI through dropdown; else use "beginner"

prompt = PromptTemplate.from_template(chosen_tone)

llm = ChatGoogleGenAI(model="gemini-2.5-flash", temperature=0.4)

output = StrOutputParser()

chain = prompt | llm | output

query = input()  #get user query from UI input box

context = db.similarity_search(query, k=3)
response = chain.run({
    "context": context,
    "question": query,
    "level": level, # based on user selection from UI
})