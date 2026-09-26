/**
 * Vitest global test setup (issue #11).
 * Imports jest-dom matchers so every test file can use
 * expect(...).toBeInTheDocument() etc. without extra imports.
 */
import '@testing-library/jest-dom';
