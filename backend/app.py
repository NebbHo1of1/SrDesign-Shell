from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "SrDesign Shell API is running"}
