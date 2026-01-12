import { render, screen } from '@testing-library/react';
import App from './App';

test('renders notes header', () => {
  render(<App />);

  // App has multiple headings (e.g., "Notes", "Your notes", "New note/Edit note").
  // Make the assertion unambiguous by targeting the main page heading (H1).
  const heading = screen.getByRole('heading', { level: 1, name: /^Notes$/ });
  expect(heading).toBeInTheDocument();

  // Additional stable UI assertions that reflect the current App.js UI.
  expect(
    screen.getByText(/create,\s*edit,\s*and delete your notes/i)
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^New$/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Save$/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Delete$/ })).toBeInTheDocument();
});
