# Bifröst
Access control for node.js, as simple as that


![Bifröst](assets/thor-bifrost-asgard.jpg)

Yet another ACL library for node.js inspired by [optimalbits/node_acl](https://github.com/optimalbits/node_acl)
Bifröst is similar to `optimalbits/node_acl` except that it has a concept of [**scope**](#concept-of-scope).

## Installation

```
$ npm install git+https://git@github.com/pSnehanshu/bifrost.git
```

## Usage
Import the library to your project and create an instance

```javascript
const Bifrost = require('bifrost');
const bifrost = new Bifrost();
```

### Define ACL
```javascript
bifrost.allow('librarian', 'books', 'create');
bifrost.allow('librarian', 'books', 'read');
bifrost.allow('librarian', 'books', 'update');
bifrost.allow('librarian', 'books', 'delete');

bifrost.allow('member', 'books', 'read');
bifrost.allow('member', 'reviews', 'create');
bifrost.allow('member', 'reviews', 'read');
bifrost.allow('member', 'reviews', 'update');
```
Here we allowed the `librarian` role to `create`, `read`, `update` and `delete` the `books` resource.

We allowed the `member` role to just `read` the `books` and `create`, `read` and `update` the `reviews` resource.

The roles and resources are created implicitly, i.e. they are automatically created if they don't exist.

### Assign roles to users
Assume that we have three users, `john`, `rajesh` and `alfred`.
1. `john` is a `librarian`
2. `rajesh` is a `member`
3. `alfred` is both a `librarian` and a `member`

We can implement this as follows:

```javascript
bifrost.assignRole('john', 'librarian');
bifrost.assignRole('rajesh', 'member');
bifrost.assignRole('alfred', 'librarian');
bifrost.assignRole('alfred', 'member');
```
### Finally, check for permission
```javascript
bifrost.isAllowed('john', 'books', 'create'); // true
bifrost.isAllowed('john', 'reviews', 'update'); // false

bifrost.isAllowed('rajesh', 'books', 'delete'); // false
bifrost.isAllowed('rajesh', 'reviews', 'read'); // true

bifrost.isAllowed('alfred', 'books', 'update'); // true
bifrost.isAllowed('alfred', 'reviews', 'create'); // true
bifrost.isAllowed('alfred', 'issues', 'create'); // false
```

**Note:** Every action on every resource is denied to every user unless explicitly allowed.
