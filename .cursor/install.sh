#!/usr/bin/env bash
#
# Cloud Agent install for the custom-home_design Gnuboard7 module.
#
# This repository is a Laravel/Gnuboard7 *module* (a library that plugs into a
# host app), so there is no standalone server to run. Development work here means
# validating the module with a PHP 8.2 + Composer toolchain (composer validate,
# autoload, php -l lint, JSON/JS checks). This script provisions that toolchain
# and generates the Composer autoloader. It is idempotent and safe to re-run.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

# --- PHP 8.2 CLI (module requires "php": "^8.2") ---------------------------
if ! command -v php8.2 >/dev/null 2>&1; then
  sudo add-apt-repository -y ppa:ondrej/php
  sudo apt-get update -qq
  sudo apt-get install -y --no-install-recommends \
    php8.2-cli php8.2-mbstring php8.2-xml php8.2-curl php8.2-bcmath unzip
fi
sudo update-alternatives --install /usr/bin/php php /usr/bin/php8.2 100 >/dev/null 2>&1 || true

# --- Composer --------------------------------------------------------------
if ! command -v composer >/dev/null 2>&1; then
  EXPECTED="$(curl -fsSL https://composer.github.io/installer.sig)"
  php -r "copy('https://getcomposer.org/installer', '/tmp/composer-setup.php');"
  ACTUAL="$(php -r "echo hash_file('sha384', '/tmp/composer-setup.php');")"
  if [ "$EXPECTED" != "$ACTUAL" ]; then
    echo "Composer installer checksum mismatch" >&2
    rm -f /tmp/composer-setup.php
    exit 1
  fi
  sudo php /tmp/composer-setup.php --quiet --install-dir=/usr/local/bin --filename=composer
  rm -f /tmp/composer-setup.php
fi

# --- Module autoloader -----------------------------------------------------
# composer.lock is gitignored and there are no third-party runtime deps, so this
# just generates the PSR-4 autoloader for Modules\Custom\HomeDesign\.
composer install --no-interaction --no-progress

php -v
composer --version
echo "custom-home_design toolchain ready."
