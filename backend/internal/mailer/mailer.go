package mailer

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
	"strconv"
)

// Config holds SMTP connection settings and application metadata used to
// build invite email links.
type Config struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	AppURL   string // base URL for invite links, e.g. http://localhost:5173
}

// Sender is the interface for sending transactional emails.
// Depend on this interface rather than *Mailer directly so callers remain
// testable without a real SMTP connection.
type Sender interface {
	SendInvite(ctx context.Context, toEmail, teamName, inviteToken string) error
}

// Mailer sends transactional emails via SMTP.
type Mailer struct {
	cfg Config
}

// NewMailer constructs a Mailer from the given Config.
func NewMailer(cfg Config) *Mailer {
	return &Mailer{cfg: cfg}
}

// SendInvite sends a plain-text invite email containing a link for the
// recipient to accept their team invitation.
//
// If Config.Host is empty the call is a no-op — useful for local dev without
// an SMTP server configured.
func (m *Mailer) SendInvite(ctx context.Context, toEmail, teamName, inviteToken string) error {
	if m.cfg.Host == "" {
		// SEC-06: do not log the raw invite token — it is a secret.
		log.Printf("mailer: SMTP not configured — skipping invite email to %s", toEmail)
		return nil
	}

	link := fmt.Sprintf("%s/accept-invite?token=%s", m.cfg.AppURL, inviteToken)

	subject := fmt.Sprintf("You've been invited to join %s", teamName)
	body := fmt.Sprintf(
		"Hi,\r\n\r\n"+
			"You've been invited to join the team \"%s\" on Sports Manager.\r\n\r\n"+
			"Click the link below to accept your invitation:\r\n"+
			"%s\r\n\r\n"+
			"This link expires in 7 days.\r\n\r\n"+
			"If you did not expect this invitation, you can safely ignore this email.\r\n",
		teamName, link,
	)

	msg := []byte(
		"From: " + m.cfg.From + "\r\n" +
			"To: " + toEmail + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"Content-Type: text/plain; charset=UTF-8\r\n" +
			"\r\n" +
			body,
	)

	addr := m.cfg.Host + ":" + strconv.Itoa(m.cfg.Port)
	auth := smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, m.cfg.Host)

	if err := smtp.SendMail(addr, auth, m.cfg.From, []string{toEmail}, msg); err != nil {
		return fmt.Errorf("send invite email: %w", err)
	}
	return nil
}
