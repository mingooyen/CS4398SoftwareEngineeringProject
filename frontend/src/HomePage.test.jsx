import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./HomePage";

function mockFetchByUrl(url) {
  if (url.includes("/api/v1/movies/genres")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        genres: [
          { id: 1, name: "Action" },
          { id: 2, name: "Comedy" },
        ],
      }),
    });
  }
  if (url.includes("/api/v1/movies/discover")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        movies: [
          { id: 11, title: "Action Movie", year: 2024, rating: 7.8, genres: [1], providers: [] },
          { id: 12, title: "Comedy Movie", year: 2023, rating: 7.2, genres: [2], providers: [] },
        ],
      }),
    });
  }
  if (url.includes("/api/v1/users/me/preferences")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        preferences: { favoriteGenres: ["Action"], forYouExcludedGenres: [], activityStatus: "active" },
      }),
    });
  }
  if (url.includes("/api/v1/users/me") && !url.includes("/preferences")) {
    return Promise.resolve({ ok: true, json: async () => ({}) });
  }
  return Promise.resolve({ ok: true, json: async () => ({}) });
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn((url) => mockFetchByUrl(String(url))));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("keeps selected preset highlighted when a genre tag is clicked", async () => {
    render(
      <HomePage
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
        highlightedName="Xavier"
        accessToken="token"
        isAuthenticated
        homeNav="Home"
        onHomeNavChange={vi.fn()}
      />
    );

    const popularTab = await screen.findByRole("button", { name: "Popular ★" });
    fireEvent.click(popularTab);
    expect(popularTab).toHaveClass("active");

    const actionTag = await screen.findByRole("button", { name: "Action" });
    fireEvent.click(actionTag);

    await waitFor(() => {
      expect(popularTab).toHaveClass("active");
      expect(actionTag).toHaveClass("active");
    });
  });
});
