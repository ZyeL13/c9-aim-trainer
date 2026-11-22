# Publishing this repo (for zyel)

The GitHub App token Muse uses cannot create repositories (GitHub returns
403 "Resource not accessible by integration"), so the empty repo must be
created by hand first. Everything else is already prepared.

## 1. Create the empty repo (zyel, 2 minutes)

1. Open https://github.com/new while signed in as **ZyeL13**.
2. Repository name: `c9-aim-trainer`
3. Visibility: **Public**
4. Add NO README, NO .gitignore, NO license — the repo must be empty.
5. Click **Create repository**.
6. Tell Muse it's done.

## 2. Push (Muse)

Once the empty repo exists, from this directory:

```bash
git remote add origin https://github.com/ZyeL13/c9-aim-trainer.git
git push -u origin main
```

The local repo is already committed on `main` (14 files, including `.idea/`
and the MIT `LICENSE` at the root), so the push is a single command.

## 3. Verify

- https://github.com/ZyeL13/c9-aim-trainer shows the files, with the MIT
  license detected in the About section.
- The demo link and video go in the Devpost submission, not here.
