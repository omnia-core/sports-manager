package handlers

import (
	"errors"
	"net/http"

	"github.com/omnia-core/sports-manager/backend/internal/repository"
	"github.com/omnia-core/sports-manager/backend/internal/usecase"
)

// writeUsecaseError maps known usecase and repository sentinel errors to
// appropriate HTTP status codes. All handlers use this single function so
// that error-to-status mapping is defined in exactly one place.
//
// Sentinel errors are checked first (via errors.Is) for precise matching.
// The final default branch catches plain validation errors returned as
// fmt.Errorf strings (e.g. "email is required") by checking the message.
func writeUsecaseError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, usecase.ErrForbidden):
		writeJSON(w, http.StatusForbidden, errBody("forbidden"))
	case errors.Is(err, repository.ErrNotFound):
		writeJSON(w, http.StatusNotFound, errBody("not found"))
	case errors.Is(err, usecase.ErrInviteAlreadyPending):
		writeJSON(w, http.StatusConflict, errBody(err.Error()))
	case errors.Is(err, usecase.ErrInviteInvalid):
		writeJSON(w, http.StatusGone, errBody(err.Error()))
	case errors.Is(err, usecase.ErrAlreadyMember):
		writeJSON(w, http.StatusConflict, errBody(err.Error()))
	case errors.Is(err, usecase.ErrNameRequired):
		writeJSON(w, http.StatusBadRequest, errBody(err.Error()))
	case errors.Is(err, usecase.ErrInvalidCredentials):
		writeJSON(w, http.StatusUnauthorized, errBody("invalid credentials"))
	default:
		// Catch plain validation errors (fmt.Errorf) that contain known phrases.
		msg := err.Error()
		if msg == "email is required" {
			writeJSON(w, http.StatusBadRequest, errBody(msg))
			return
		}
		writeJSON(w, http.StatusInternalServerError, errBody("an error occurred"))
	}
}
