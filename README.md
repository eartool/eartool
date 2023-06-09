# TODO

## refactor

- [x] when you move into a package, your imports need to be updated that refer to that package
- [x] need to re-export once you move!
- [ ] !! IMPORTANT: Sideways requires updating imports locally
- [ ] deleting imports leaves a new line right now it seem
- [ ] `import { a, b } from "foo"` doesn't clean up comma before if last
- [ ] we need to handle sidestream and downstream
- [ ] we need a way to not require ordering

Future:

- [ ] Support aborting on banned deps

## fix-namespaces

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
