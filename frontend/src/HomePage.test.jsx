import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./HomePage";

function HomeWithNavState() {
  const [tab, setTab] = useState("Home");
  return (
    <HomePage
      onNavigate={vi.fn()}
      onLogout={vi.fn()}
      highlightedName="Xavier"
      accessToken="token"
      isAuthenticated
      homeNav={tab}
      onHomeNavChange={setTab}
    />
  );
}

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

  it("does not revert a For you genre tag when an older preferences fetch finishes late", async () => {
    let finishStalePreferences;
    const stalePreferencesPromise = new Promise((resolve) => {
      finishStalePreferences = resolve;
    });
    let preferencesRequestCount = 0;

    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/api/v1/movies/genres")) {
        return mockFetchByUrl(url);
      }
      if (url.includes("/api/v1/movies/discover")) {
        return mockFetchByUrl(url);
      }
      if (url.includes("/api/v1/users/me/preferences")) {
        preferencesRequestCount += 1;
        if (preferencesRequestCount === 1) {
          return stalePreferencesPromise.then(() => ({
            ok: true,
            json: async () => ({
              preferences: {
                favoriteGenres: [],
                forYouExcludedGenres: [],
                activityStatus: "active",
              },
            }),
          }));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            preferences: {
              favoriteGenres: ["Action"],
              forYouExcludedGenres: [],
              activityStatus: "active",
            },
          }),
        });
      }
      if (url.includes("/api/v1/users/me") && !url.includes("/preferences")) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

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

    fireEvent.click(await screen.findByRole("button", { name: "Popular ★" }));
    fireEvent.click(await screen.findByRole("button", { name: "Action" }));
    fireEvent.click(screen.getByRole("button", { name: "For you" }));

    const mixRegion = await screen.findByRole("group", { name: /Your For you mix/i });
    await waitFor(() => {
      expect(within(mixRegion).getByText("Action")).toBeInTheDocument();
    });

    finishStalePreferences();

    await waitFor(() => {
      expect(within(mixRegion).getByText("Action")).toBeInTheDocument();
    });
  });

  it("PATCHes merged favoriteGenres when clicking a genre chip after prefs load (Popular preset)", async () => {
    const patchBodies = [];
    const fetchMock = vi.fn((input, init) => {
      const url = String(input);
      if (url.includes("/api/v1/movies/genres")) {
        return mockFetchByUrl(url);
      }
      if (url.includes("/api/v1/movies/discover")) {
        return mockFetchByUrl(url);
      }
      if (url.includes("/api/v1/users/me/preferences")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            preferences: {
              favoriteGenres: ["Family", "Adventure"],
              forYouExcludedGenres: [],
              activityStatus: "active",
            },
          }),
        });
      }
      if (url.includes("/api/v1/users/me") && !url.includes("/preferences")) {
        if (init?.method === "PATCH" && typeof init.body === "string") {
          try {
            patchBodies.push(JSON.parse(init.body));
          } catch {
            patchBodies.push(null);
          }
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

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

    const mixRegion = await screen.findByRole("group", { name: /Your For you mix/i });
    expect(within(mixRegion).getByText("Family")).toBeInTheDocument();

    const popularTab = screen.getByRole("button", { name: "Popular ★" });
    fireEvent.click(popularTab);

    const comedyPill = await screen.findByRole("button", { name: "Comedy" });
    fireEvent.click(comedyPill);

    await waitFor(() => {
      expect(patchBodies.length).toBeGreaterThan(0);
      const prefs = patchBodies[patchBodies.length - 1]?.preferences;
      expect(prefs?.favoriteGenres).toEqual(
        expect.arrayContaining(["Family", "Adventure", "Comedy"])
      );
    });
  });

  it("shows read-only For you mix labels (no remove-from-mix controls)", async () => {
    vi.stubGlobal("fetch", vi.fn((url) => mockFetchByUrl(String(url))));

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

    fireEvent.click(await screen.findByRole("button", { name: "For you" }));

    const mixRegion = await screen.findByRole("group", { name: /Your For you mix/i });
    expect(within(mixRegion).getByText("Action")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Remove Action from your For you mix/i })
    ).not.toBeInTheDocument();
  });

  it("moves main nav highlight from Home to Watchlist when Watchlist is clicked", async () => {
    vi.stubGlobal("fetch", vi.fn((url) => mockFetchByUrl(String(url))));
    render(<HomeWithNavState />);

    const homeBtn = await screen.findByRole("button", { name: "Home" });
    const watchBtn = screen.getByRole("button", { name: "Watchlist" });

    expect(homeBtn).toHaveAttribute("aria-current", "page");
    expect(watchBtn).not.toHaveAttribute("aria-current");

    fireEvent.click(watchBtn);

    await waitFor(() => {
      expect(watchBtn).toHaveAttribute("aria-current", "page");
      expect(homeBtn).not.toHaveAttribute("aria-current");
    });
  });
});
