# Authentication System

## Overview
The AI Sysadmin Agent now includes a complete JWT-based authentication system to secure access to the application.

## Features

### Backend
- **User Model**: Stores user credentials securely with hashed passwords
- **JWT Tokens**: Stateless authentication using JSON Web Tokens
- **Password Hashing**: Uses bcrypt for secure password storage
- **Protected Routes**: All API endpoints require authentication

### Frontend
- **Login/Register Page**: Combined authentication interface
- **Token Storage**: JWT tokens stored in localStorage
- **Protected Dashboard**: Automatic redirection based on auth status
- **Logout Functionality**: Clear token and redirect to login

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
  - Body: `{ email, username, password, full_name? }`
  - Returns: User object

- `POST /api/v1/auth/login` - Login and get access token
  - Body: Form data with `username` and `password`
  - Returns: `{ access_token, token_type }`

- `GET /api/v1/auth/me` - Get current user information
  - Headers: `Authorization: Bearer <token>`
  - Returns: Current user object

## Usage

### First Time Setup
1. Navigate to `/login`
2. Click "Don't have an account? Register"
3. Fill in email, username, and password
4. Click "Register"
5. Login with your credentials

### Accessing the Dashboard
1. Navigate to `/login`
2. Enter username and password
3. Click "Login"
4. You'll be redirected to `/dashboard`

### Logout
Click the "Logout" button in the dashboard header

## Security Considerations

### Production Deployment
1. **Change SECRET_KEY**: Set a strong, random `SECRET_KEY` in `.env`
2. **HTTPS Only**: Always use HTTPS in production
3. **Token Expiration**: Tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES` (default: 30 minutes)
4. **Password Requirements**: Consider adding password strength requirements
5. **Rate Limiting**: Add rate limiting to prevent brute force attacks

### Environment Variables
Add to `backend/.env`:
```
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Database Schema

### Users Table
- `id`: Primary key
- `email`: Unique email address
- `username`: Unique username
- `hashed_password`: Bcrypt hashed password
- `full_name`: Optional full name
- `is_active`: Boolean flag for active users
- `is_superuser`: Boolean flag for admin users
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Technical Implementation

### Password Hashing
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

### JWT Token Creation
```python
from jose import jwt
access_token = jwt.encode({"sub": username}, SECRET_KEY, algorithm=ALGORITHM)
```

### Protected Routes
```python
from dependencies import get_current_active_user

@router.get("/protected")
def protected_route(current_user: User = Depends(get_current_active_user)):
    return {"message": f"Hello {current_user.username}"}
```

## Future Enhancements
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, GitHub)
- [ ] Role-based access control (RBAC)
- [ ] Session management
- [ ] Refresh tokens
