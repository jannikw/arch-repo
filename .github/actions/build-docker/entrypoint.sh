#!/usr/bin/env bash

set -e

if [ -z "$1" ]; then
  echo "No package to build specified!"
  exit 1
fi

cd "$1"
chown -R makepkg:users .

pacman -Syu --noconfirm
sudo -u makepkg makepkg --noconfirm -sf
# sudo -u makepkg makepkg --printsrcinfo > .SRCINFO

ls /home/makepkg/out/*
mkdir -p ../__build__
mv /home/makepkg/out/* ../__build__