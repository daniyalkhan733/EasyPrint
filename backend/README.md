# EasyPrint - Backend

Flask backend API for EasyPrint, handling document processing and order management.

## Getting Started

### Prerequisites

- Python 3.11+ installed
- Virtual environment (recommended)

### Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Update .env with your configuration
```

### Development

```bash
# Run development server
python app.py

# Or with Flask CLI
flask run
```

The API will be available at `http://localhost:5000`

### Production

```bash
# Using Gunicorn (recommended)
gunicorn app:app --config gunicorn.conf.py

# Or with custom settings
gunicorn app:app --bind 0.0.0.0:5000 --workers 4
```

## Project Structure

```
backend/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── gunicorn.conf.py   # Gunicorn configuration
├── Procfile           # Process file for deployment
├── runtime.txt        # Python version for deployment
├── .env.example       # Environment variables template
├── uploads/           # Uploaded files directory
├── processed/         # Processed files directory
└── db.json           # JSON database (replace with PostgreSQL in production)
```

## API Endpoints

### Create Order
```http
POST /api/orders/create
Content-Type: multipart/form-data

Parameters:
- files: File[] (documents to print)
- config: JSON (print configuration)
- studentName: string
- sessionId: string (optional)
```

### Get Order
```http
GET /api/orders/<order_id>
```

### List Orders
```http
GET /api/orders
```

### Get Shop Orders
```http
GET /api/shop/orders
```

### Update Order Status
```http
PUT /api/orders/<order_id>/status
Content-Type: application/json

Body:
{
  "status": "processing" | "ready" | "completed"
}
```

### Download Processed File
```http
GET /api/orders/<order_id>/download
```

## Features

- **Document Processing**: 
  - PDF merging and manipulation
  - DOCX to PDF conversion
  - Image to PDF conversion
  - Page range selection
  - Duplicate copies generation

- **Print Configuration**:
  - Color/Black & White
  - Single/Double sided
  - Page orientation
  - Binding options
  - Custom page ranges

- **File Management**:
  - Secure file upload
  - File validation
  - Automatic cleanup

## Environment Variables

Create a `.env` file with:

```env
FLASK_ENV=production
PORT=5000
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.vercel.app
MAX_UPLOAD_SIZE=10485760
```

## Technologies Used

- **Flask**: Python web framework
- **Flask-CORS**: Cross-origin resource sharing
- **Pillow**: Image processing
- **PyPDF2**: PDF manipulation
- **python-docx**: DOCX processing
- **ReportLab**: PDF generation
- **Gunicorn**: WSGI HTTP server

## Deployment

See the [DEPLOYMENT.md](../DEPLOYMENT.md) file in the root directory for comprehensive deployment instructions.

### Quick Deploy to Render

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your repository
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `gunicorn app:app`
6. Add environment variables
7. Deploy!

## Production Considerations

### Database
Replace `db.json` with a proper database:

```bash
# Install PostgreSQL adapter
pip install psycopg2-binary

# Update requirements.txt
echo "psycopg2-binary" >> requirements.txt
```

### File Storage
For production, use cloud storage instead of local files:

```bash
# AWS S3
pip install boto3

# Or Cloudinary
pip install cloudinary
```

### Security
- Enable HTTPS
- Configure CORS properly
- Add rate limiting
- Implement authentication
- Sanitize file uploads
- Set up proper logging

## Development Tools

```bash
# Format code
pip install black
black app.py

# Lint code
pip install pylint
pylint app.py

# Type checking
pip install mypy
mypy app.py
```

## Testing

```bash
# Install testing dependencies
pip install pytest pytest-flask

# Run tests
pytest
```

## Troubleshooting

### Port already in use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

### Module not found
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### CORS errors
Verify `ALLOWED_ORIGINS` in `.env` matches your frontend URL

## License

MIT License - see LICENSE file for details
