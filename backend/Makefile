.PHONY: migrate-up migrate-down run

ENV ?= local

-include .env.$(ENV)
export DATABASE_URL

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down

run:
	APP_ENV=$(ENV) go run ./cmd/server
