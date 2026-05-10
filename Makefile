NPM := npm
NPX := npx
VSCE := node_modules/.bin/vsce
ARGS = `arg="$(filter-out $@,$(MAKECMDGOALS))" && echo $${arg:-${1}}`

.PHONY: install
install:
	$(NPM) ci

.PHONY: icon
icon:
	node scripts/generate-icon.js

.PHONY: compile
compile:
	$(NPM) run compile

.PHONY: watch
watch:
	$(NPM) run watch

.PHONY: lint
lint:
	$(NPM) run lint

.PHONY: test
test:
	$(NPM) test
	$(NPM) run test:extension

.PHONY: test-unit
test-unit:
	$(NPM) test

.PHONY: test-extension
test-extension:
	$(NPM) run test:extension

.PHONY: package
package:
	rm -f *.vsix
	$(VSCE) package

.PHONY: clean
clean:
	rm -rf \
		out \
		*.vsix \
		.vscode-test \
		node_modules \
		.claude

.PHONY: clean-ignored
clean-ignored:
	git clean -fdX

.PHONY: clean-all
clean-all: clean clean-ignored

.PHONY: changelog
changelog: install
	npx changie batch $(call ARGS,defaultstring)
	npx changie merge

.PHONY: change
change: install
	npx changie new
