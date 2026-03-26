import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [hourly, setHourly] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('dark');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    document.body.className = theme;
    const storedHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    setHistory(storedHistory);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const saveToHistory = (searchCity) => {
    // Keep last 5 unique searches
    const updatedHistory = [searchCity, ...history.filter(c => c.toLowerCase() !== searchCity.toLowerCase())].slice(0, 5);
    setHistory(updatedHistory);
    localStorage.setItem('weatherHistory', JSON.stringify(updatedHistory));
  };

  const fetchWeather = async (searchCity) => {
    if (!searchCity) return;
    setLoading(true);
    setError('');
    
    try {
      const [weatherRes, forecastRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/weather?city=${searchCity}`),
        axios.get(`${API_BASE_URL}/forecast?city=${searchCity}`)
      ]);
      setWeather(weatherRes.data);
      setForecast(forecastRes.data.forecast);
      setHourly(forecastRes.data.hourly);
      saveToHistory(weatherRes.data.city); // standardized name from backend
      setCity('');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('City not found. Please try again.');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch weather data.');
      }
      setWeather(null);
      setForecast(null);
      setHourly(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByLocation = () => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const [weatherRes, forecastRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/weather?lat=${latitude}&lon=${longitude}`),
            axios.get(`${API_BASE_URL}/forecast?lat=${latitude}&lon=${longitude}`)
          ]);
          setWeather(weatherRes.data);
          setForecast(forecastRes.data.forecast);
          setHourly(forecastRes.data.hourly);
          saveToHistory(weatherRes.data.city);
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to fetch location weather.');
        } finally {
          setLoading(false);
        }
      }, (err) => {
        setError('Location access denied. Please search instead.');
        setLoading(false);
      });
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchWeather(city);
  };

  const handleHistoryClick = (histCity) => {
    fetchWeather(histCity);
  };

  return (
    <div className={`app-container ${theme}`}>
      <header className="header fadeIn">
        <h1>The Weather</h1>
        <button className="theme-toggle" onClick={toggleTheme}>
           {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </header>

      <main className="main-content slideUp">
        <form className="search-form" onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Search for a city..." 
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            className="search-input"
          />
          <button type="submit" className="btn-primary">Search</button>
          <button type="button" className="btn-secondary" onClick={fetchWeatherByLocation} title="Use my location" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v2"></path>
              <path d="M12 20v2"></path>
              <path d="M2 12h2"></path>
              <path d="M20 12h2"></path>
              <circle cx="12" cy="12" r="4"></circle>
            </svg>
          </button>
        </form>

        {history.length > 0 && (
          <div className="search-history fadeIn">
            <p>Recent:</p>
            {history.map((item, index) => (
              <span key={index} className="history-pill" onClick={() => handleHistoryClick(item)}>
                {item}
              </span>
            ))}
          </div>
        )}

        {loading && <div className="loader">🌤️ Fetching skies...</div>}
        
        {error && <div className="error-message">Oops! {error}</div>}

        {weather && !loading && (
          <div className="weather-dashboard fadeIn">
            <section className="highlight-card">
              <div className="weather-main-info">
                <h2>{weather.city}, {weather.country}</h2>
                <div className="temp-display">
                  <img src={`https://openweathermap.org/img/wn/${weather.icon}@4x.png`} alt={weather.description} className="weather-icon-large" />
                  <span className="temperature">{weather.temperature}°</span>
                </div>
                <p className="condition">{weather.condition} &mdash; {weather.description}</p>
              </div>
              <div className="grid-2">
                <div className="detail-box">
                  <span className="label">Feels Like</span>
                  <span className="value">{weather.feels_like}°</span>
                </div>
                <div className="detail-box">
                  <span className="label">Humidity</span>
                  <span className="value">{weather.humidity}%</span>
                </div>
                <div className="detail-box">
                  <span className="label">Wind</span>
                  <span className="value">{weather.wind_speed} m/s</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {hourly && !loading && (
          <section className="hourly-forecast slideUp">
            <h3>Hourly Forecast (Next 24 Hours)</h3>
            <div className="hourly-chart-wrapper">
              <svg viewBox="-2 -2 104 104" preserveAspectRatio="none" className="hourly-line-svg">
                 <linearGradient id="gradientLine" x1="0" y1="0" x2="1" y2="0">
                   <stop offset="0%" stopColor="#f09819" />
                   <stop offset="100%" stopColor="#edde5d" />
                 </linearGradient>
                 <polyline 
                   fill="none" 
                   stroke="url(#gradientLine)" 
                   strokeWidth="2" 
                   strokeLinecap="round" 
                   strokeLinejoin="round" 
                   points={
                     hourly.map((h, i) => {
                       const maxTemp = Math.max(...hourly.map(t => t.temp));
                       const minTemp = Math.min(...hourly.map(t => t.temp));
                       const range = maxTemp - minTemp === 0 ? 1 : maxTemp - minTemp;
                       const x = (i / (hourly.length - 1)) * 100;
                       const y = 100 - (((h.temp - minTemp) / range) * 70 + 15);
                       return `${x},${y}`;
                     }).join(' ')
                   } 
                 />
                 {hourly.map((h, i) => {
                   const maxTemp = Math.max(...hourly.map(t => t.temp));
                   const minTemp = Math.min(...hourly.map(t => t.temp));
                   const range = maxTemp - minTemp === 0 ? 1 : maxTemp - minTemp;
                   const x = (i / (hourly.length - 1)) * 100;
                   const y = 100 - (((h.temp - minTemp) / range) * 70 + 15);
                   return <circle key={i} cx={x} cy={y} r="2" fill="#fff" stroke="#f09819" strokeWidth="1" className="data-point" />;
                 })}
              </svg>
              <div className="hourly-labels">
                 {hourly.map((h, i) => (
                   <div key={i} className="hourly-label">
                     <span className="h-temp">{h.temp}°</span>
                     <span className="h-time">{h.time}</span>
                   </div>
                 ))}
              </div>
            </div>
          </section>
        )}

        {forecast && !loading && (
          <section className="forecast slideUp">
            <h3>5-Day Forecast</h3>
            <div className="forecast-grid">
              {forecast.map((day, index) => (
                <div key={index} className="forecast-card">
                  <p className="forecast-date">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <img src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`} alt={day.description} className="weather-icon" />
                  <p className="forecast-temp">{day.temperature}°</p>
                  <p className="forecast-desc">{day.condition}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
