# Testing Patterns

**Analysis Date:** 2026-01-12

## Test Framework

**Runner:**
- Playwright 1.x - E2E testing (primary for server testing)
- Jest (via react-scripts) - Unit tests in `SchoolQuizGame`

**Configuration:**
- `GameBuddieGamesServer/playwright.config.ts` - E2E config
- CRA default Jest config in `SchoolQuizGame`

**Assertion Library:**
- Playwright built-in `expect`
- Jest built-in `expect` for unit tests

**Run Commands:**
```bash
# Unified Game Server (Playwright E2E)
cd GameBuddieGamesServer
npm test                              # Run all tests
npm run test:ui                       # Interactive UI mode
npm run test:headed                   # Run with visible browser
npm run test:report                   # Show HTML report
npm run test:cluescale                # Run ClueScale tests only
npm run test:health                   # Run health check tests

# SchoolQuizGame (Jest)
cd SchoolQuizGame
npm test                              # Run Jest tests
```

## Test File Organization

**Location:**
- E2E tests: `GameBuddieGamesServer/tests/` (separate directory)
- Unit tests: Co-located with source in `SchoolQuizGame`
- Integration tests: Playwright tests cover full stack

**Naming:**
- Playwright: `*.spec.ts` in tests directory
- Jest: `*.test.ts` or `*.test.tsx` alongside source

**Structure:**
```
GameBuddieGamesServer/
  tests/
    server-health.spec.ts    # Health check tests
    cluescale.spec.ts        # ClueScale game tests
    ...
  playwright.config.ts

SchoolQuizGame/
  src/
    components/
      Component.tsx
      Component.test.tsx     # Co-located
```

## Test Structure

**Playwright E2E Pattern:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to page
    await page.goto('/game');
  });

  test('should handle expected behavior', async ({ page }) => {
    // Arrange
    await page.fill('[data-testid="input"]', 'test');

    // Act
    await page.click('[data-testid="submit"]');

    // Assert
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

**Jest Unit Test Pattern:**
```typescript
import { render, screen } from '@testing-library/react';
import Component from './Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component prop="value" />);
    expect(screen.getByText('expected text')).toBeInTheDocument();
  });
});
```

**Patterns:**
- `beforeEach` for per-test setup
- `afterEach` for cleanup
- Arrange/Act/Assert structure
- One assertion focus per test (multiple expects OK)

## Mocking

**Playwright:**
- Uses real browser and real server
- Network mocking via `page.route()` for external APIs
- No module mocking (E2E philosophy)

**Jest:**
- Module mocking via `jest.mock()`
- Manual mocks in `__mocks__/` directories
- React Testing Library for component rendering

**What to Mock (E2E):**
- External API responses (if needed)
- Time-sensitive operations

**What NOT to Mock (E2E):**
- Internal modules (test full stack)
- Socket.io connections (test real behavior)
- Database (in-memory anyway)

## Fixtures and Factories

**Test Data (Playwright):**
```typescript
// Inline test data
const testPlayer = {
  name: 'TestPlayer',
  roomCode: 'TEST123'
};

// Page object pattern for complex flows
class GamePage {
  constructor(private page: Page) {}

  async createRoom(playerName: string) {
    await this.page.fill('[data-testid="player-name"]', playerName);
    await this.page.click('[data-testid="create-room"]');
  }
}
```

**Location:**
- Fixtures inline in test files (simple data)
- Page objects in test files or `tests/pages/`

## Coverage

**Requirements:**
- No enforced coverage target
- E2E tests focus on critical user paths
- Manual testing supplements automated tests

**Configuration:**
- Playwright: No built-in coverage (E2E focus)
- Jest: Coverage via `--coverage` flag

**View Coverage:**
```bash
# Jest coverage
cd SchoolQuizGame && npm test -- --coverage

# Playwright report
cd GameBuddieGamesServer && npm run test:report
```

## Test Types

**E2E Tests (Playwright):**
- Test full user flows
- Real browser, real server
- Focus on multiplayer scenarios
- Examples: Room creation, game flow, reconnection

**Unit Tests (Jest):**
- Test individual components/functions
- Mock external dependencies
- Fast execution
- Examples: Component rendering, utility functions

**Integration Tests:**
- Covered by Playwright E2E tests
- Test Socket.io communication
- Test server-client interaction

**Manual Testing:**
- Visual testing at multiple viewports
- Browser DevTools for WebSocket monitoring
- Network throttling for connection issues

## Common Patterns

**Async Testing (Playwright):**
```typescript
test('should handle async operation', async ({ page }) => {
  await page.click('[data-testid="action"]');

  // Wait for result
  await expect(page.locator('[data-testid="result"]'))
    .toBeVisible({ timeout: 5000 });
});
```

**Error Testing:**
```typescript
test('should show error on invalid input', async ({ page }) => {
  await page.fill('[data-testid="input"]', 'invalid');
  await page.click('[data-testid="submit"]');

  await expect(page.locator('.error-message'))
    .toContainText('Invalid input');
});
```

**Socket.io Testing:**
```typescript
// Test via UI interaction (E2E approach)
test('should sync game state across players', async ({ browser }) => {
  const player1 = await browser.newPage();
  const player2 = await browser.newPage();

  // Player 1 creates room
  await player1.goto('/game');
  await player1.click('[data-testid="create-room"]');
  const roomCode = await player1.locator('[data-testid="room-code"]').textContent();

  // Player 2 joins
  await player2.goto('/game');
  await player2.fill('[data-testid="room-code-input"]', roomCode);
  await player2.click('[data-testid="join-room"]');

  // Verify both see each other
  await expect(player1.locator('[data-testid="player-count"]')).toHaveText('2');
  await expect(player2.locator('[data-testid="player-count"]')).toHaveText('2');
});
```

**Viewport Testing:**
Test at multiple breakpoints as documented:
- 375px (mobile)
- 768px (tablet)
- 1024px (small desktop)
- 1366px (laptop)
- 1920px (desktop)

---

*Testing analysis: 2026-01-12*
*Update when test patterns change*
