# TODO

## General

- [ ] Make workspace argument optional and find the workspace instead

## refactor

- [x] when you move into a package, your imports need to be updated that refer to that package
- [x] need to re-export once you move!
- [x] fix updating related files that are lcoal
- [x] accumulate is leaving an invalid `import {} from "./Icon";` even though Icon was moved!
- [x] if local files reference a file that will be moved, that pakage needs to be added to package.json
- [x] !! IMPORTANT: Sideways requires updating imports locally
- [x] deleting imports leaves a new line right now it seem
- [x] replacing doesn't handle an import that is now empty
- [ ] `import { a, b } from "foo"` doesn't clean up comma before if last
- [ ] we need a way to not require ordering

Future:

- [ ] Support aborting on banned deps
- [ ] we need to handle sidestream and downstream

## fix-namespaces

- [ ] Investigate: `ERROR (88776): Unexpected kind TypeAliasDeclaration`

### faux-namespaces

For the faux-namespaces, we need to handle this case:

// no other imports. No type declaration
export const SelectionOperations = {
clone,
of,
add,
fromBackings,
fromLocators,
fromIds,
equals,
contains,
union,
difference,
xor,
asSet,
asSetWithoutFragments,
size,
isEmpty,
};

# Future Ideas

- Renames real selectors selectFoo instead of getFoo across code base
- Drop unused exports
