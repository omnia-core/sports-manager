package cookie

import (
	"net/http"
	"strings"
	"time"
)

func IsSecure(r *http.Request) bool {
	host := r.Host
	return !strings.HasPrefix(host, "localhost") && !strings.HasPrefix(host, "127.0.0.1")
}

func SetTokenCookie(w http.ResponseWriter, r *http.Request, name, value string, ttl time.Duration) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   int(ttl.Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   IsSecure(r),
	})
}

func ClearTokenCookies(w http.ResponseWriter, r *http.Request) {
	for _, name := range []string{"access_token", "refresh_token"} {
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			Secure:   IsSecure(r),
		})
	}
}
