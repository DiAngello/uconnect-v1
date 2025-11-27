from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime, date, time
from typing import Optional, List
# Seus models.py agora não usam mais PostType
from .models import UserRole, AccessStatus 

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime

class TokenData(BaseModel):
    registration: Optional[str] = None

class UserLogin(BaseModel):
    registration: str
    password: str

class UserBase(BaseModel):
    registration: str
    name: str
    email: EmailStr
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    accessStatus: AccessStatus
    createdAt: datetime
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    accessStatus: Optional[AccessStatus] = None

class UserStatusUpdate(BaseModel):
    accessStatus: AccessStatus

class UserRoleUpdate(BaseModel):
    role: str

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    eventDate: date
    startTime: Optional[time] = None
    endTime: Optional[time] = None
    academicGroupId: Optional[int] = None

class EventCreate(BaseModel):
    title: str
    date: date
    hora: Optional[str] = None
    description: Optional[str] = None
    local: Optional[str] = None
    academicGroupId: Optional[int] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    eventDate: Optional[date] = None
    startTime: Optional[time] = None
    endTime: Optional[time] = None
    academicGroupId: Optional[int] = None

class EventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    timestamp: datetime
    eventDate: date
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    academicGroupId: Optional[int] = None
    creatorId: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class AcademicGroupBase(BaseModel):
    course: str
    classGroup: str
    subject: str

class AcademicGroupCreate(AcademicGroupBase):
    pass

class AcademicGroupUpdate(AcademicGroupBase):
    pass

class AcademicGroupResponse(AcademicGroupBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class AcademicGroupDetailResponse(AcademicGroupResponse):
    users: List[UserResponse] = []

# --- SCHEMAS DE POST ---
class PostBase(BaseModel):
    title: str = Field(..., min_length=3)
    content: str = Field(..., min_length=3)

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3)
    content: Optional[str] = Field(None, min_length=3)

class PostResponse(PostBase):
    id: int
    date: datetime
    author: UserResponse
    model_config = ConfigDict(from_attributes=True)
# --- FIM DE POST ---

# --- NOVOS SCHEMAS PARA ANNOUNCEMENT ---
class AnnouncementBase(BaseModel):
    title: str = Field(..., min_length=3)
    content: str = Field(..., min_length=3)

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3)
    content: Optional[str] = Field(None, min_length=3)

class AnnouncementResponse(AnnouncementBase):
    id: int
    date: datetime
    author: UserResponse
    model_config = ConfigDict(from_attributes=True)
# --- FIM DE ANNOUNCEMENT ---

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    timestamp: datetime
    authorId: int
    authorName: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class UserSimple(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class Chat(BaseModel):
    id: int
    title: str
    participants: List[UserSimple]
    last_message: Optional[Message] = None
    model_config = ConfigDict(from_attributes=True)

class ChatCreate(BaseModel):
    participant_ids: List[int]
    title: Optional[str] = None

class AccessManagerBase(BaseModel):
    userId: int
    permission: str

class AccessManagerCreate(AccessManagerBase):
    pass

class AccessManagerUpdate(BaseModel):
    permission: str | None = None

class AccessManagerResponse(AccessManagerBase):
    id: int
    createdAt: datetime

    class Config:
        orm_mode = True
