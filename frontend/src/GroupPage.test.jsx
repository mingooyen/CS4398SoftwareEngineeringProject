import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import GroupPage from "./GroupPage";

describe("GroupPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a new group and shows it in My Groups", async () => {
    render(
      <GroupPage
        onNavigate={() => {}}
        onLogout={() => {}}
        highlightedName="Xavier"
        accessToken=""
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Group name"), {
      target: { value: "Weekend Movies" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("button", { name: "Open Group" })).toBeInTheDocument();
    expect(screen.getAllByText("Weekend Movies").length).toBeGreaterThan(0);
  });
});
