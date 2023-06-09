# TODO

## refactor

- [x] when you move into a package, your imports need to be updated that refer to that package
- [ ] need to re-export once you move!
- [ ] deleting imports leaves a new line right now it seem
- [ ] `import { a, b } from "foo"` doesn't clean up comma before if last
- [ ] we need to handle sidestream and downstream

## faux-namespaces

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
