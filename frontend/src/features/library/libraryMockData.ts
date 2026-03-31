import type { LibraryFolder } from './types'

const now = new Date().toISOString()
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

export const mockLibraryFolders: LibraryFolder[] = [
  {
    id: 'folder-mechanics',
    name: '力学教学资源',
    categoryId: 'kinematics',
    coverType: 'blank',
    coverPath: '',
    assetCount: 12,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  },
  {
    id: 'folder-electromagnetism',
    name: '电磁学资料库',
    categoryId: 'electrostatics',
    coverType: 'blank',
    coverPath: '',
    assetCount: 8,
    createdAt: daysAgo(25),
    updatedAt: daysAgo(5),
  },
  {
    id: 'folder-optics',
    name: '光学实验素材',
    categoryId: 'geometric-optics',
    coverType: 'blank',
    coverPath: '',
    assetCount: 6,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
  },
  {
    id: 'folder-thermodynamics',
    name: '热学课件集合',
    categoryId: 'gas-laws',
    coverType: 'blank',
    coverPath: '',
    assetCount: 5,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(3),
  },
  {
    id: 'folder-modern',
    name: '近代物理专题',
    categoryId: 'quantum-mechanics',
    coverType: 'blank',
    coverPath: '',
    assetCount: 4,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
  },
]
