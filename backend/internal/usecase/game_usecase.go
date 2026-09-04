package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/repository"
)

type gameUsecase struct {
	repo     domains.GameRepository
	teamRepo domains.TeamRepository
}

func NewGameUsecase(repo domains.GameRepository, teamRepo domains.TeamRepository) domains.GameUsecase {
	return &gameUsecase{repo: repo, teamRepo: teamRepo}
}

func (u *gameUsecase) CreateGame(ctx context.Context, req domains.CreateGameRequest) (domains.CreateGameResponse, error) {
	req.OpponentName = strings.TrimSpace(req.OpponentName)
	if req.OpponentName == "" {
		return domains.CreateGameResponse{}, ErrNameRequired
	}

	if err := requireCoach(ctx, u.teamRepo, req.TeamID, req.CallerID); err != nil {
		return domains.CreateGameResponse{}, err
	}

	res, err := u.repo.CreateGame(ctx, req)
	if err != nil {
		return domains.CreateGameResponse{}, fmt.Errorf("create game: %w", err)
	}

	membersRes, err := u.teamRepo.ListMembers(ctx, domains.ListMembersRequest{TeamID: req.TeamID, CallerID: req.CallerID})
	if err != nil {
		return domains.CreateGameResponse{}, fmt.Errorf("list members for seed: %w", err)
	}

	seedReq := domains.SeedGamePlayersRequest{GameID: res.Game.ID}
	for _, mwu := range membersRes.Members {
		seedReq.MemberIDs = append(seedReq.MemberIDs, mwu.Member.ID)
	}
	if _, err := u.repo.SeedGamePlayers(ctx, seedReq); err != nil {
		return domains.CreateGameResponse{}, fmt.Errorf("seed game players: %w", err)
	}

	return res, nil
}

func (u *gameUsecase) ListGames(ctx context.Context, req domains.ListGamesRequest) (domains.ListGamesResponse, error) {
	if err := requireMember(ctx, u.teamRepo, req.TeamID, req.CallerID); err != nil {
		return domains.ListGamesResponse{}, err
	}
	res, err := u.repo.ListGames(ctx, req)
	if err != nil {
		return domains.ListGamesResponse{}, fmt.Errorf("list games: %w", err)
	}
	return res, nil
}

func (u *gameUsecase) GetGameDetail(ctx context.Context, req domains.GetGameDetailRequest) (domains.GetGameDetailResponse, error) {
	gameRes, err := u.repo.GetGame(ctx, domains.GetGameRequest{GameID: req.GameID, CallerID: req.CallerID})
	if errors.Is(err, repository.ErrNotFound) {
		return domains.GetGameDetailResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.GetGameDetailResponse{}, fmt.Errorf("get game for detail: %w", err)
	}

	callerRole, err := memberRole(ctx, u.teamRepo, gameRes.Game.TeamID, req.CallerID)
	if err != nil {
		return domains.GetGameDetailResponse{}, err
	}

	// Seed any team members added after game creation. ON CONFLICT DO NOTHING makes this idempotent.
	membersRes, err := u.teamRepo.ListMembers(ctx, domains.ListMembersRequest{TeamID: gameRes.Game.TeamID, CallerID: req.CallerID})
	if err != nil {
		return domains.GetGameDetailResponse{}, fmt.Errorf("list members for reseed: %w", err)
	}
	seedReq := domains.SeedGamePlayersRequest{GameID: req.GameID}
	for _, mwu := range membersRes.Members {
		seedReq.MemberIDs = append(seedReq.MemberIDs, mwu.Member.ID)
	}
	if len(seedReq.MemberIDs) > 0 {
		if _, err := u.repo.SeedGamePlayers(ctx, seedReq); err != nil {
			return domains.GetGameDetailResponse{}, fmt.Errorf("reseed game players: %w", err)
		}
	}

	res, err := u.repo.GetGameDetail(ctx, req)
	if err != nil {
		return domains.GetGameDetailResponse{}, fmt.Errorf("get game detail: %w", err)
	}
	res.CallerRole = callerRole
	return res, nil
}

func (u *gameUsecase) UpdateGame(ctx context.Context, req domains.UpdateGameRequest) (domains.UpdateGameResponse, error) {
	gameRes, err := u.repo.GetGame(ctx, domains.GetGameRequest{GameID: req.GameID, CallerID: req.CallerID})
	if errors.Is(err, repository.ErrNotFound) {
		return domains.UpdateGameResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.UpdateGameResponse{}, fmt.Errorf("get game for update: %w", err)
	}

	if err := requireCoach(ctx, u.teamRepo, gameRes.Game.TeamID, req.CallerID); err != nil {
		return domains.UpdateGameResponse{}, err
	}

	res, err := u.repo.UpdateGame(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.UpdateGameResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.UpdateGameResponse{}, fmt.Errorf("update game: %w", err)
	}
	return res, nil
}

func (u *gameUsecase) DeleteGame(ctx context.Context, req domains.DeleteGameRequest) (domains.DeleteGameResponse, error) {
	gameRes, err := u.repo.GetGame(ctx, domains.GetGameRequest{GameID: req.GameID, CallerID: req.CallerID})
	if errors.Is(err, repository.ErrNotFound) {
		return domains.DeleteGameResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.DeleteGameResponse{}, fmt.Errorf("get game for delete: %w", err)
	}

	if err := requireCoach(ctx, u.teamRepo, gameRes.Game.TeamID, req.CallerID); err != nil {
		return domains.DeleteGameResponse{}, err
	}

	res, err := u.repo.DeleteGame(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.DeleteGameResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.DeleteGameResponse{}, fmt.Errorf("delete game: %w", err)
	}
	return res, nil
}

func (u *gameUsecase) UpsertStats(ctx context.Context, req domains.UpsertStatsRequest) (domains.UpsertStatsResponse, error) {
	gameRes, err := u.repo.GetGame(ctx, domains.GetGameRequest{GameID: req.GameID, CallerID: req.CallerID})
	if errors.Is(err, repository.ErrNotFound) {
		return domains.UpsertStatsResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.UpsertStatsResponse{}, fmt.Errorf("get game for upsert stats: %w", err)
	}

	if err := requireCoach(ctx, u.teamRepo, gameRes.Game.TeamID, req.CallerID); err != nil {
		return domains.UpsertStatsResponse{}, err
	}

	res, err := u.repo.UpsertStats(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.UpsertStatsResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.UpsertStatsResponse{}, fmt.Errorf("upsert stats: %w", err)
	}
	return res, nil
}

func (u *gameUsecase) ToggleDNP(ctx context.Context, req domains.ToggleDNPRequest) (domains.ToggleDNPResponse, error) {
	gameRes, err := u.repo.GetGame(ctx, domains.GetGameRequest{GameID: req.GameID, CallerID: req.CallerID})
	if errors.Is(err, repository.ErrNotFound) {
		return domains.ToggleDNPResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.ToggleDNPResponse{}, fmt.Errorf("get game for toggle dnp: %w", err)
	}

	if err := requireCoach(ctx, u.teamRepo, gameRes.Game.TeamID, req.CallerID); err != nil {
		return domains.ToggleDNPResponse{}, err
	}

	res, err := u.repo.ToggleDNP(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.ToggleDNPResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.ToggleDNPResponse{}, fmt.Errorf("toggle dnp: %w", err)
	}
	return res, nil
}
