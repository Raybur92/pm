import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginPage } from "@/components/LoginPage";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock auth context
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    login: vi.fn(async (username: string, password: string) => {
      return username === "user" && password === "password";
    }),
  }),
}));

describe("LoginPage", () => {
  it("renders login form with username and password inputs", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("username-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-button")).toBeInTheDocument();
  });

  it("displays demo credentials hint", () => {
    render(<LoginPage />);
    expect(screen.getByText(/Demo credentials: user \/ password/)).toBeInTheDocument();
  });

  it("renders with correct title", () => {
    render(<LoginPage />);
    expect(screen.getByText("Kanban Studio")).toBeInTheDocument();
  });

  it("allows typing in username and password fields", async () => {
    render(<LoginPage />);
    const usernameInput = screen.getByTestId("username-input") as HTMLInputElement;
    const passwordInput = screen.getByTestId("password-input") as HTMLInputElement;

    await userEvent.type(usernameInput, "user");
    await userEvent.type(passwordInput, "password");

    expect(usernameInput.value).toBe("user");
    expect(passwordInput.value).toBe("password");
  });

  it("has submit button that is clickable", async () => {
    render(<LoginPage />);
    const button = screen.getByTestId("login-button");
    expect(button).not.toBeDisabled();
  });

  it("has accessible labels for form fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });
});
