# Project website

Build the Zensical site in this repository. Publish the generated pages on GitHub Pages.

- [x] Agree on the five pages and record the files below.
- [x] Write the pages, add the project figures and check the local build.
- [x] Add the GitHub Pages workflow.
- [ ] Confirm the published site opens on GitHub Pages.

## Files

| File | Purpose |
| --- | --- |
| `docs/index.md` | Project summary and key findings |
| `docs/design.md` | Instruction encoding, pipeline and arithmetic |
| `docs/verification.md` | Tests and writeback waveform |
| `docs/results.md` | FPGA area, timing and power comparison |
| `docs/reproduce.md` | Simulation and FPGA commands |
| `docs/assets/` | Figures selected from the project archive |
| `zensical.toml` | Navigation and site settings |
| `requirements-docs.txt` | Zensical version used to build the site |
| `.github/workflows/docs.yml` | GitHub Pages build and deployment |

Use the technical handoff and checked reports as the source for numerical claims. Keep each step in its own commit and push it to `Master` before starting the next one.

## Publish

In the repository's **Settings → Pages**, select **GitHub Actions** as the source. Run the **Documentation** workflow on `Master` for the first deployment. Later pushes that change the documentation or its build files trigger the same workflow.
