package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/omnia-core/sports-manager/backend/internal/handlers"
	"github.com/omnia-core/sports-manager/backend/internal/middleware"
	"github.com/joho/godotenv"
	pkgdb "github.com/omnia-core/sports-manager/backend/internal/pkg/db"
	"github.com/omnia-core/sports-manager/backend/internal/repository"
	"github.com/omnia-core/sports-manager/backend/internal/usecase"
)

func main() {
	loadEnv()

	databaseURL := requireEnv("DATABASE_URL")
	jwtSecret := requireEnv("JWT_SECRET")

	db, err := pkgdb.Connect(databaseURL)
	if err != nil {
		log.Fatalf("connect to database: %v", err)
	}
	defer db.Close()

	// Dependency wiring: repository → usecase → handler
	authRepo := repository.NewAuthRepository(db)
	authUC := usecase.NewAuthUsecase(authRepo, jwtSecret)
	authHandler := handlers.NewAuthHandler(authUC)

	r := chi.NewRouter()

	// Global middleware
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type"},
		AllowCredentials: true,
	}))

	// Health check
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Auth routes
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)
		r.Post("/logout", authHandler.Logout)
		r.Post("/refresh", authHandler.Refresh)

		// TODO: POST /api/auth/google

		// Protected auth routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.Authenticate(jwtSecret, authUC))
			r.Get("/me", authHandler.GetUser)
		})
	})

	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

// loadEnv loads .env.<APP_ENV> (e.g. .env.local) when not in production.
// In production, environment variables are injected by the platform directly.
func loadEnv() {
	appEnv := os.Getenv("APP_ENV")
	if appEnv == "" {
		appEnv = "local"
	}
	if appEnv == "production" {
		return
	}
	file := fmt.Sprintf(".env.%s", appEnv)
	if err := godotenv.Load(file); err != nil {
		log.Printf("no %s file found, relying on environment variables", file)
	}
}

// requireEnv returns the value of an environment variable or fatals if unset.
func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required environment variable %q is not set", key)
	}
	return v
}
