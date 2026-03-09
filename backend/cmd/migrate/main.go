package main

import (
	"errors"
	"flag"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	dir := flag.String("dir", "migrations", "path to migrations directory")
	flag.Parse()

	if flag.NArg() < 1 {
		log.Fatal("usage: migrate [-dir <path>] up|down")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	m, err := migrate.New("file://"+*dir, dbURL)
	if err != nil {
		log.Fatalf("init migrate: %v", err)
	}
	defer m.Close()

	switch flag.Arg(0) {
	case "up":
		if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Fatalf("migrate up: %v", err)
		}
		log.Println("migrations applied")
	case "down":
		if err := m.Down(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Fatalf("migrate down: %v", err)
		}
		log.Println("migrations rolled back")
	default:
		log.Fatalf("unknown command %q — use up or down", flag.Arg(0))
	}
}
