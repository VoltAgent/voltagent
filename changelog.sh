#!/bin/bash

# Name of the main CHANGELOG.md file in your project's root directory
ROOT_CHANGELOG="CHANGELOG.md"
PACKAGES_DIR="packages"
CORE_PACKAGE_DIR_NAME="core" # Directory name of the package to process first


# Function: Appends the changelog of a specific package to the main file
# Takes the package's directory name as an argument
append_package_changelog() {
  local package_dir_name="$1"
  local package_path="$PACKAGES_DIR/$package_dir_name"
  local package_changelog_file="$package_path/CHANGELOG.md"
  local package_json_file="$package_path/package.json"
  local display_package_name="$package_dir_name" # Default to using the directory name

  if [ ! -d "$package_path" ]; then
    # echo "Info: Directory $package_dir_name not found." # Optional info message
    return
  fi

  # Read package name from package.json (requires jq)
  if [ -f "$package_json_file" ]; then
    if command -v jq &> /dev/null; then
      # If jq is installed and name field exists, use it
      pkg_name_from_json=$(jq -r '.name' "$package_json_file")
      if [ "$pkg_name_from_json" != "null" ] && [ -n "$pkg_name_from_json" ]; then
        display_package_name="$pkg_name_from_json"
      else
        echo "Warning: '.name' field not found or empty in $package_json_file. Using directory name ($package_dir_name)."
      fi
    else
      echo "Warning: 'jq' command not found. Directory names will be used for package names. Please install 'jq' for more accurate names."
    fi
  else
    echo "Warning: $package_json_file not found. Using directory name ($package_dir_name) for package name."
  fi

  if [ -f "$package_changelog_file" ]; then
    echo "Processing: $display_package_name (Directory: $package_dir_name)"

    # Add the package title to the main CHANGELOG.md file
    echo "## Package: $display_package_name" >> "$ROOT_CHANGELOG"
    echo "" >> "$ROOT_CHANGELOG" # Blank line after the title

    # Append the content of the package's CHANGELOG.md to the main file
    tail -n +2 "$package_changelog_file" >> "$ROOT_CHANGELOG"
    
    echo "" >> "$ROOT_CHANGELOG" # Blank line after package content
    echo "---" >> "$ROOT_CHANGELOG" # Separator between packages
    echo "" >> "$ROOT_CHANGELOG"
  elif [ -d "$package_path" ]; then # If directory exists but changelog doesn't
    echo "Warning: CHANGELOG.md not found for $display_package_name (Directory: $package_dir_name)."
  fi
}

# 1. Process the 'core' package first (by its directory name)
if [ -d "$PACKAGES_DIR/$CORE_PACKAGE_DIR_NAME" ]; then
  append_package_changelog "$CORE_PACKAGE_DIR_NAME"
else
  echo "Warning: Priority package directory '$CORE_PACKAGE_DIR_NAME' not found."
fi

# 2. Then process other packages (excluding core)
for PACKAGE_FULL_PATH in "$PACKAGES_DIR"/*; do
  if [ -d "$PACKAGE_FULL_PATH" ]; then # If it's a directory
    CURRENT_PACKAGE_DIR_NAME=$(basename "$PACKAGE_FULL_PATH")
    
    # If the current package is not the 'core' package's directory, process it
    if [ "$CURRENT_PACKAGE_DIR_NAME" != "$CORE_PACKAGE_DIR_NAME" ]; then
      append_package_changelog "$CURRENT_PACKAGE_DIR_NAME"
    fi
  fi
done

echo "Main CHANGELOG.md file successfully created/updated: $ROOT_CHANGELOG"