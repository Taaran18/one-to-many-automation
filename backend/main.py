from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from datetime import timedelta
import os, uuid, shutil

import models, schemas, auth
from database import engine, get_db
from routers import leads, templates, campaigns, dashboard, whatsapp, chats
from scheduler import check_scheduled_campaigns

os.makedirs("uploads", exist_ok=True)

try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_scheduled_campaigns, "interval", minutes=1, id="campaign_scheduler")
    scheduler.start()
    print("[scheduler] Campaign scheduler started — checking every 60s")
    yield
    scheduler.shutdown(wait=False)
    print("[scheduler] Campaign scheduler stopped")


app = FastAPI(title="OneToMany Automation API", lifespan=lifespan)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register Routers
app.include_router(leads.router)
app.include_router(templates.router)
app.include_router(campaigns.router)
app.include_router(dashboard.router)
app.include_router(whatsapp.router)
app.include_router(chats.router)


# Core Auth Endpoints
@app.get("/")
async def root():
    return {"status": "success", "message": "OneToMany Automation API"}


@app.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(status_code=400, detail="Only jpg, png, webp, gif allowed.")
    filename = f"{uuid.uuid4().hex}.{ext}"
    with open(f"uploads/{filename}", "wb") as f:
        shutil.copyfileobj(file.file, f)
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    return {"url": f"{backend_url}/uploads/{filename}"}


@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if not user.email and not user.phone_no:
        raise HTTPException(
            status_code=400, detail="Must provide email or phone number"
        )

    if user.email:
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")

    if user.phone_no:
        db_user = (
            db.query(models.User).filter(models.User.phone_no == user.phone_no).first()
        )
        if db_user:
            raise HTTPException(
                status_code=400, detail="Phone number already registered"
            )

    encrypted_password = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email, phone_no=user.phone_no, password=encrypted_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    username = form_data.username
    if "@" in username:
        user = db.query(models.User).filter(models.User.email == username).first()
    else:
        user = db.query(models.User).filter(models.User.phone_no == username).first()

    if not user or not auth.verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    sub = user.email if user.email else user.phone_no
    access_token = auth.create_access_token(
        data={"sub": sub}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/{provider}/login")
async def auth_login(provider: str):
    if provider == "google":
        return {
            "message": "Google Login API Keys not configured. Please add GOOGLE_CLIENT_ID to .env."
        }
    return {"message": f"{provider} Login API Keys not configured."}


@app.get("/auth/{provider}/callback")
async def auth_callback(provider: str, request: Request):
    return {"message": f"{provider} successful callback! Needs processing logic."}
