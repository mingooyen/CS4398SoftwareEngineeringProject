import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./HomePage", () => ({
  default: ({ onNavigate }) => (
    <div>
      <div>Mock Home</div>
      <button type="button" onClick={() => onNavigate("login")}>
        Go Login
      </button>
    </div>
  ),
}));

vi.mock("./GroupPage", () => ({
  default: () => <div>Mock Group</div>,
}));

vi.mock("./GroupDetailPage", () => ({
  default: () => <div>Mock Group Detail</div>,
}));

vi.mock("./AdminControlsModal.jsx", () => ({
  default: () => null,
}));

vi.mock("./AuthPage.jsx", () => ({
  default: ({ mode }) => <div>{mode === "login" ? "Mock Login" : "Mock Signup"}</div>,
}));

vi.mock("./authService.js", () => ({
  getStoredSession: () => null,
  clearSession: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  DEMO_ACCOUNTS: [],
}));

describe("App routing", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })));
  });

  it("navigates from home to login route", async () => {
    render(<App />);
    expect(screen.getByText("Mock Home")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Go Login" }));
    expect(await screen.findByText("Mock Login")).toBeInTheDocument();
  });
});
