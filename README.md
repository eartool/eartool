# TODO

## refactor

when you move into a package, your imports need to be updated that refer to that package

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
