export interface TaxonomyGroup {
  id: string
  title: string
  order?: number
  hidden?: boolean
  count?: number
  categoryCount?: number
}

export interface TaxonomyCategory {
  id: string
  groupId: string
  title: string
  order?: number
  hidden?: boolean
  count?: number
  dynamicCount?: number
}

export interface TaxonomySelection {
  kind: 'group' | 'category'
  id: string
}

export interface TaxonomyTreeNode {
  group: TaxonomyGroup
  categories: TaxonomyCategory[]
}
