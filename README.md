# Car Part Scraper API

## Railway Deployment

1. Push this code to GitHub
2. Go to railway.app
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository
5. Railway will auto-detect Node.js
6. Add environment variables if needed
7. Deploy!

## API Endpoints

### POST /scrape
Body:
```json
{
  "year": "2015",
  "make": "honda",
  "model": "civic",
  "part": "center console",
  "jobId": "optional-uuid"
}
```

Response:
```json
{
  "success": true,
  "results": [...],
  "total": 1234,
  "jobId": "uuid"
}
```

### GET /health
Health check endpoint
