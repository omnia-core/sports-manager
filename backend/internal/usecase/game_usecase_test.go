package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/models"
	"github.com/omnia-core/sports-manager/backend/internal/repository"
	"github.com/omnia-core/sports-manager/backend/internal/usecase"
)

// ── Minimal fakes ────────────────────────────────────────────────────────────

type fakeGameRepo struct {
	createFn func(ctx context.Context, req domains.CreateGameRequest) (domains.CreateGameResponse, error)
	seedFn   func(ctx context.Context, req domains.SeedGamePlayersRequest) (domains.SeedGamePlayersResponse, error)
}

func (f *fakeGameRepo) CreateGame(ctx context.Context, req domains.CreateGameRequest) (domains.CreateGameResponse, error) {
	return f.createFn(ctx, req)
}
func (f *fakeGameRepo) SeedGamePlayers(ctx context.Context, req domains.SeedGamePlayersRequest) (domains.SeedGamePlayersResponse, error) {
	return f.seedFn(ctx, req)
}
func (f *fakeGameRepo) GetGame(ctx context.Context, req domains.GetGameRequest) (domains.GetGameResponse, error) {
	return domains.GetGameResponse{}, nil
}
func (f *fakeGameRepo) ListGames(ctx context.Context, req domains.ListGamesRequest) (domains.ListGamesResponse, error) {
	return domains.ListGamesResponse{Games: []*models.Game{}}, nil
}
func (f *fakeGameRepo) GetGameDetail(ctx context.Context, req domains.GetGameDetailRequest) (domains.GetGameDetailResponse, error) {
	return domains.GetGameDetailResponse{}, nil
}
func (f *fakeGameRepo) UpdateGame(ctx context.Context, req domains.UpdateGameRequest) (domains.UpdateGameResponse, error) {
	return domains.UpdateGameResponse{}, nil
}
func (f *fakeGameRepo) DeleteGame(ctx context.Context, req domains.DeleteGameRequest) (domains.DeleteGameResponse, error) {
	return domains.DeleteGameResponse{}, nil
}
func (f *fakeGameRepo) UpsertStats(ctx context.Context, req domains.UpsertStatsRequest) (domains.UpsertStatsResponse, error) {
	return domains.UpsertStatsResponse{}, nil
}
func (f *fakeGameRepo) ToggleDNP(ctx context.Context, req domains.ToggleDNPRequest) (domains.ToggleDNPResponse, error) {
	return domains.ToggleDNPResponse{}, nil
}

type fakeTeamRepo struct {
	getMembershipFn func(ctx context.Context, req domains.GetMembershipRequest) (domains.GetMembershipResponse, error)
	listMembersFn   func(ctx context.Context, req domains.ListMembersRequest) (domains.ListMembersResponse, error)
}

func (f *fakeTeamRepo) GetMembership(ctx context.Context, req domains.GetMembershipRequest) (domains.GetMembershipResponse, error) {
	return f.getMembershipFn(ctx, req)
}
func (f *fakeTeamRepo) ListMembers(ctx context.Context, req domains.ListMembersRequest) (domains.ListMembersResponse, error) {
	return f.listMembersFn(ctx, req)
}
func (f *fakeTeamRepo) CreateTeam(ctx context.Context, req domains.CreateTeamRequest) (domains.CreateTeamResponse, error) {
	return domains.CreateTeamResponse{}, nil
}
func (f *fakeTeamRepo) GetTeam(ctx context.Context, req domains.GetTeamRequest) (domains.GetTeamResponse, error) {
	return domains.GetTeamResponse{}, nil
}
func (f *fakeTeamRepo) ListTeams(ctx context.Context, req domains.ListTeamsRequest) (domains.ListTeamsResponse, error) {
	return domains.ListTeamsResponse{}, nil
}
func (f *fakeTeamRepo) UpdateTeam(ctx context.Context, req domains.UpdateTeamRequest) (domains.UpdateTeamResponse, error) {
	return domains.UpdateTeamResponse{}, nil
}
func (f *fakeTeamRepo) DeleteTeam(ctx context.Context, req domains.DeleteTeamRequest) (domains.DeleteTeamResponse, error) {
	return domains.DeleteTeamResponse{}, nil
}
func (f *fakeTeamRepo) RemoveMember(ctx context.Context, req domains.RemoveMemberRequest) (domains.RemoveMemberResponse, error) {
	return domains.RemoveMemberResponse{}, nil
}

// ── Tests ─────────────────────────────────────────────────────────────────────

func TestCreateGame_EmptyOpponent_ReturnsError(t *testing.T) {
	coachID := uuid.New()
	teamID := uuid.New()

	teamRepo := &fakeTeamRepo{
		getMembershipFn: func(_ context.Context, req domains.GetMembershipRequest) (domains.GetMembershipResponse, error) {
			return domains.GetMembershipResponse{Member: &models.TeamMember{Role: models.RoleCoach}}, nil
		},
		listMembersFn: func(_ context.Context, _ domains.ListMembersRequest) (domains.ListMembersResponse, error) {
			return domains.ListMembersResponse{Members: []domains.MemberWithUser{}}, nil
		},
	}
	gameRepo := &fakeGameRepo{}

	uc := usecase.NewGameUsecase(gameRepo, teamRepo)

	_, err := uc.CreateGame(context.Background(), domains.CreateGameRequest{
		TeamID:       teamID,
		CallerID:     coachID,
		OpponentName: "   ", // whitespace only
		GameDate:     time.Now(),
	})

	if err == nil {
		t.Fatal("expected error for empty opponent name, got nil")
	}
	if !errors.Is(err, usecase.ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}
}

func TestCreateGame_NonCoach_ReturnsForbidden(t *testing.T) {
	playerID := uuid.New()
	teamID := uuid.New()

	teamRepo := &fakeTeamRepo{
		getMembershipFn: func(_ context.Context, _ domains.GetMembershipRequest) (domains.GetMembershipResponse, error) {
			return domains.GetMembershipResponse{Member: &models.TeamMember{Role: models.RolePlayer}}, nil
		},
		listMembersFn: func(_ context.Context, _ domains.ListMembersRequest) (domains.ListMembersResponse, error) {
			return domains.ListMembersResponse{}, nil
		},
	}
	gameRepo := &fakeGameRepo{}

	uc := usecase.NewGameUsecase(gameRepo, teamRepo)

	_, err := uc.CreateGame(context.Background(), domains.CreateGameRequest{
		TeamID:       teamID,
		CallerID:     playerID,
		OpponentName: "Lakers",
		GameDate:     time.Now(),
	})

	if !errors.Is(err, usecase.ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

// Ensure the fakeTeamRepo satisfies domains.TeamRepository at compile time.
var _ domains.TeamRepository = (*fakeTeamRepo)(nil)

// Ensure the fakeGameRepo satisfies domains.GameRepository at compile time.
var _ domains.GameRepository = (*fakeGameRepo)(nil)

// Suppress unused import for repository package (used indirectly via ErrNotFound).
var _ = repository.ErrNotFound
