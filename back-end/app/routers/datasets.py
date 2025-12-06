from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd

router = APIRouter(prefix="/api/v1/datasets", tags=["datasets"])

@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Please upload an Excel file")
    df = pd.read_excel(file.file)
    return {
        "filename": file.filename,
        "rows": int(len(df)),
        "columns": list(df.columns),
        "preview": df.head(5).to_dict(orient="records")
    }
