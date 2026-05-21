import os
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import JWTError, jwt
from database import get_db
from models import Usuario
from auth import hash_password, verify_password, create_token, get_current_user, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    nombre: str
    email: str
    password: str
    tarjeta_profesional: str = ""


class TokenOut(BaseModel):
    access_token: str
    token_type: str
    user: dict


@router.post("/register", response_model=TokenOut, status_code=201)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(Usuario).filter_by(email=payload.email).first():
        raise HTTPException(400, "Ya existe una cuenta con ese email")
    user = Usuario(
        nombre=payload.nombre,
        email=payload.email,
        password_hash=hash_password(payload.password),
        tarjeta_profesional=payload.tarjeta_profesional,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": _user_dict(user)}


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter_by(email=form.username, active=True).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, "Email o contraseña incorrectos")
    token = create_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": _user_dict(user)}


@router.get("/me")
def me(user: Usuario = Depends(get_current_user)):
    return _user_dict(user)


class UpdateMeIn(BaseModel):
    nombre: str
    tarjeta_profesional: str = ""


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


@router.put("/me")
def update_me(payload: UpdateMeIn, user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    if not payload.nombre.strip():
        raise HTTPException(400, "El nombre no puede estar vacío")
    user.nombre = payload.nombre.strip()
    user.tarjeta_profesional = payload.tarjeta_profesional.strip()
    db.commit()
    db.refresh(user)
    return _user_dict(user)


@router.post("/change-password")
def change_password(payload: ChangePasswordIn, user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(400, "Contraseña actual incorrecta")
    if len(payload.new_password) < 6:
        raise HTTPException(400, "La nueva contraseña debe tener al menos 6 caracteres")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Contraseña actualizada correctamente"}


class ForgotPasswordIn(BaseModel):
    email: str


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter_by(email=payload.email, active=True).first()
    # Always return 200 to prevent email enumeration
    if not user:
        return {"message": "Si el email está registrado, recibirás un enlace de recuperación."}

    # Create a short-lived reset token (1 hour)
    reset_token = create_token(
        {"sub": user.email, "type": "reset"},
        expires_delta=timedelta(hours=1),
    )

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/?reset_token={reset_token}"

    # Try to send email; if SMTP not configured, return token in dev mode for testing
    smtp_configured = bool(os.getenv("SMTP_USER") and os.getenv("SMTP_PASS"))
    if smtp_configured:
        try:
            from services.email_service import _send_email
            _send_email(
                to=user.email,
                subject="ContaFlow — Recuperación de contraseña",
                html=f"""
                <div style="background:#080F1E;color:#E8EEF8;padding:32px;font-family:sans-serif;border-radius:8px">
                  <h2 style="color:#00D97E">Recuperar contraseña</h2>
                  <p>Hola {user.nombre},<br>Haz clic en el enlace para restablecer tu contraseña (válido 1 hora):</p>
                  <a href="{reset_link}" style="display:inline-block;background:#00D97E;color:#080F1E;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:700">
                    Restablecer contraseña
                  </a>
                  <p style="color:#7A95B8;font-size:12px;margin-top:24px">Si no solicitaste esto, ignora este correo.</p>
                </div>
                """,
            )
        except Exception:
            pass

    demo = os.getenv("DEMO_MODE", "false").lower() == "true"
    response = {"message": "Si el email está registrado, recibirás un enlace de recuperación."}
    if demo or not smtp_configured:
        response["reset_link"] = reset_link  # Only in dev/demo — never in production
    return response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    try:
        data = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(400, "Enlace inválido o expirado")

    if data.get("type") != "reset":
        raise HTTPException(400, "Token no válido para este uso")

    email = data.get("sub")
    if not email:
        raise HTTPException(400, "Token malformado")

    user = db.query(Usuario).filter_by(email=email, active=True).first()
    if not user:
        raise HTTPException(400, "Usuario no encontrado")

    if len(payload.new_password) < 6:
        raise HTTPException(400, "La nueva contraseña debe tener al menos 6 caracteres")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Contraseña actualizada correctamente. Ya puedes iniciar sesión."}


def _user_dict(user: Usuario) -> dict:
    return {
        "id": user.id,
        "nombre": user.nombre,
        "email": user.email,
        "tarjeta_profesional": user.tarjeta_profesional,
    }
