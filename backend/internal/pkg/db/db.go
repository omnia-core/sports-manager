package db

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

// Connect opens a PostgreSQL connection and verifies it with a ping.
func Connect(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping db: %w", err)
	}

	return db, nil
}
