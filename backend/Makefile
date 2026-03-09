.PHONY: migrate-up migrate-down dev

migrate-up:
	migrate -path ./migrations -database "postgres://sports_manager:sports_manager@localhost:5432/sports_manager?sslmode=disable" up

migrate-down:
	migrate -path ./migrations -database "postgres://sports_manager:sports_manager@localhost:5432/sports_manager?sslmode=disable" down

dev:
	go run cmd/server/main.go
