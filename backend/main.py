from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

app = FastAPI(title="Weather App API")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

@app.get("/api/weather")
async def get_weather(city: str = None, lat: float = None, lon: float = None):
    """Fetch current weather data for a city or coordinates."""
    if not API_KEY or API_KEY == "your_api_key_here":
        raise HTTPException(status_code=500, detail="OpenWeather API key not configured. Add it in backend/.env")
        
    async with httpx.AsyncClient() as client:
        if city:
            weather_url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
        elif lat is not None and lon is not None:
            weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
        else:
            raise HTTPException(status_code=400, detail="City name or coordinates (lat, lon) required")
            
        res = await client.get(weather_url)
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail="Weather data not found. Please check city name.")
        
        data = res.json()
        
        return {
            "city": data["name"],
            "country": data.get("sys", {}).get("country", ""),
            "temperature": round(data["main"]["temp"]),
            "feels_like": round(data["main"]["feels_like"]),
            "humidity": data["main"]["humidity"],
            "condition": data["weather"][0]["main"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"],
            "wind_speed": data["wind"]["speed"]
        }

@app.get("/api/forecast")
async def get_forecast(city: str = None, lat: float = None, lon: float = None):
    """Fetch 5-day weather forecast (extracted to daily snapshots)."""
    if not API_KEY or API_KEY == "your_api_key_here":
        raise HTTPException(status_code=500, detail="OpenWeather API key not configured. Add it in backend/.env")
        
    async with httpx.AsyncClient() as client:
        if city:
            forecast_url = f"https://api.openweathermap.org/data/2.5/forecast?q={city}&appid={API_KEY}&units=metric"
        elif lat is not None and lon is not None:
            forecast_url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
        else:
            raise HTTPException(status_code=400, detail="City name or coordinates required")
            
        res = await client.get(forecast_url)
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail="Forecast data not found.")
        
        data = res.json()
        
        processed_forecast = []
        hourly_forecast = []
        
        # Grab next 8 items (24 hours) for the graph
        for item in data["list"][:8]:
            dt_txt = item["dt_txt"]
            # Ex: dt_txt is "2026-03-26 15:00:00", we want "3 PM"
            dt_obj = datetime.strptime(dt_txt, "%Y-%m-%d %H:%M:%S")
            time_str = dt_obj.strftime("%I %p").lstrip("0")
            hourly_forecast.append({
                "time": time_str,
                "temp": round(item["main"]["temp"])
            })

        # OpenWeather forecast is every 3 hours. Grab one reading per day (e.g., 12:00:00).
        for item in data["list"]:
            if "12:00:00" in item["dt_txt"]:
                processed_forecast.append({
                    "date": item["dt_txt"].split(" ")[0],
                    "temperature": round(item["main"]["temp"]),
                    "condition": item["weather"][0]["main"],
                    "description": item["weather"][0]["description"],
                    "icon": item["weather"][0]["icon"]
                })
                
        return {
            "city": data["city"]["name"], 
            "forecast": processed_forecast,
            "hourly": hourly_forecast
        }
