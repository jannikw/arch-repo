# Arch Repository

Arch package repository that makes use of GitHub actions to automate building of the packages and GitHub pages for their distribution.

## Usage

Add the following to `/etc/pacman.conf`
```
[jannikw-repo]
SigLevel = Never
Server = https://jannikw.github.io/arch-repo
```