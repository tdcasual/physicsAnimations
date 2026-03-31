import type { CatalogData, CatalogItem } from './types'

const createMockItem = (
  id: string,
  title: string,
  description: string,
  categoryId: string,
  href: string
): CatalogItem => ({
  id,
  type: 'upload',
  categoryId,
  title,
  description,
  href,
  src: '',
  thumbnail: '',
  order: 0,
})

export const mockCatalogItems: CatalogItem[] = [
  // 力学 - 运动学
  createMockItem('mechanics-1', '自由落体运动', '展示物体在重力作用下的自由下落过程，包含速度-时间图像', 'kinematics', '/viewer/free-fall'),
  createMockItem('mechanics-2', '斜面运动', '物体在斜面上的运动分析，包含力的分解与合成', 'kinematics', '/viewer/inclined-plane'),
  
  // 力学 - 动力学
  createMockItem('mechanics-3', '单摆运动', '单摆的简谐振动演示，展示周期与摆长的关系', 'dynamics', '/viewer/pendulum'),
  createMockItem('mechanics-4', '弹簧振子', '水平弹簧振子的简谐运动，能量转化过程可视化', 'dynamics', '/viewer/spring-oscillator'),
  
  // 力学 - 牛顿定律
  createMockItem('mechanics-5', '牛顿第一定律', '惯性定律的动画演示，展示力与运动状态的关系', 'newton-laws', '/viewer/newton-first'),
  createMockItem('mechanics-6', '牛顿第二定律', 'F=ma 的直观展示，力、质量与加速度的关系', 'newton-laws', '/viewer/newton-second'),
  
  // 力学 - 动量
  createMockItem('mechanics-7', '完全弹性碰撞', '两球弹性碰撞过程，动量守恒与能量守恒', 'momentum', '/viewer/elastic-collision'),
  
  // 力学 - 圆周运动
  createMockItem('mechanics-8', '圆周运动', '匀速圆周运动的向心力分析，线速度与角速度关系', 'circular-motion', '/viewer/circular-motion'),
  
  // 电磁学 - 静电学
  createMockItem('electromagnetism-1', '库仑定律', '点电荷之间的静电力演示，力与距离的关系', 'electrostatics', '/viewer/coulomb-law'),
  createMockItem('electromagnetism-2', '电场线分布', '各种电荷分布的电场线可视化，正负电荷、电偶极子', 'electrostatics', '/viewer/electric-field'),
  createMockItem('electromagnetism-3', '带电粒子在电场中', '电子在匀强电场中的偏转运动，示波器原理', 'electrostatics', '/viewer/charged-particle-electric'),
  
  // 电磁学 - 磁学
  createMockItem('electromagnetism-4', '安培力', '通电导线在磁场中受到的力，左手定则应用', 'magnetism', '/viewer/ampere-force'),
  createMockItem('electromagnetism-5', '洛伦兹力', '带电粒子在磁场中的运动，回旋加速器原理', 'magnetism', '/viewer/lorentz-force'),
  
  // 电磁学 - 电磁感应
  createMockItem('electromagnetism-6', '电磁感应', '法拉第电磁感应定律，磁通量变化产生感应电流', 'electromagnetic-induction', '/viewer/electromagnetic-induction'),
  createMockItem('electromagnetism-7', '变压器原理', '理想变压器的电压变换，原副线圈匝数比', 'electromagnetic-induction', '/viewer/transformer'),
  
  // 热学
  createMockItem('thermodynamics-1', '分子热运动', '布朗运动模拟，温度与分子平均动能的关系', 'kinetic-theory', '/viewer/brownian-motion'),
  createMockItem('thermodynamics-2', '理想气体状态方程', 'PV=nRT 的可视化，压强、体积、温度的关系', 'gas-laws', '/viewer/ideal-gas'),
  createMockItem('thermodynamics-3', '热机循环', '卡诺循环过程，热效率的计算', 'thermodynamic-processes', '/viewer/carnot-cycle'),
  createMockItem('thermodynamics-4', '热传导', '不同材料的热传导对比，稳态温度分布', 'heat-transfer', '/viewer/heat-conduction'),
  
  // 光学
  createMockItem('optics-1', '光的反射', '镜面反射与漫反射，反射定律演示', 'geometric-optics', '/viewer/light-reflection'),
  createMockItem('optics-2', '光的折射', '折射定律，全反射现象与临界角', 'geometric-optics', '/viewer/light-refraction'),
  createMockItem('optics-3', '凸透镜成像', '物距、像距与焦距的关系，各种成像情况', 'lenses', '/viewer/convex-lens'),
  createMockItem('optics-4', '双缝干涉', '杨氏双缝实验，干涉条纹的形成原理', 'wave-optics', '/viewer/double-slit'),
  createMockItem('optics-5', '光的衍射', '单缝衍射现象，衍射角与波长的关系', 'wave-optics', '/viewer/diffraction'),
  
  // 近代物理
  createMockItem('modern-1', '光电效应', '光子说解释光电效应，截止频率与逸出功', 'quantum-mechanics', '/viewer/photoelectric-effect'),
  createMockItem('modern-2', '氢原子能级', '玻尔模型，能级跃迁与光谱线', 'quantum-mechanics', '/viewer/hydrogen-levels'),
  createMockItem('modern-3', '放射性衰变', 'α、β、γ衰变过程，半衰期概念', 'nuclear-physics', '/viewer/radioactive-decay'),
  createMockItem('modern-4', '核反应', '核裂变与核聚变，质量亏损与能量释放', 'nuclear-physics', '/viewer/nuclear-reaction'),
  createMockItem('modern-5', '质能方程', 'E=mc² 的物理意义，质量与能量的等价', 'nuclear-physics', '/viewer/mass-energy'),
]

const getItemsByCategory = (categoryId: string) =>
  mockCatalogItems.filter(item => item.categoryId === categoryId)

export const mockCatalogData: CatalogData = {
  groups: {
    mechanics: {
      id: 'mechanics',
      title: '力学',
      order: 1,
      hidden: false,
      categories: {
        kinematics: {
          id: 'kinematics',
          groupId: 'mechanics',
          title: '运动学',
          order: 1,
          items: getItemsByCategory('kinematics'),
        },
        dynamics: {
          id: 'dynamics',
          groupId: 'mechanics',
          title: '动力学',
          order: 2,
          items: getItemsByCategory('dynamics'),
        },
        'newton-laws': {
          id: 'newton-laws',
          groupId: 'mechanics',
          title: '牛顿定律',
          order: 3,
          items: getItemsByCategory('newton-laws'),
        },
        momentum: {
          id: 'momentum',
          groupId: 'mechanics',
          title: '动量',
          order: 4,
          items: getItemsByCategory('momentum'),
        },
        'circular-motion': {
          id: 'circular-motion',
          groupId: 'mechanics',
          title: '圆周运动',
          order: 5,
          items: getItemsByCategory('circular-motion'),
        },
      },
    },
    electromagnetism: {
      id: 'electromagnetism',
      title: '电磁学',
      order: 2,
      hidden: false,
      categories: {
        electrostatics: {
          id: 'electrostatics',
          groupId: 'electromagnetism',
          title: '静电学',
          order: 1,
          items: getItemsByCategory('electrostatics'),
        },
        magnetism: {
          id: 'magnetism',
          groupId: 'electromagnetism',
          title: '磁学',
          order: 2,
          items: getItemsByCategory('magnetism'),
        },
        'electromagnetic-induction': {
          id: 'electromagnetic-induction',
          groupId: 'electromagnetism',
          title: '电磁感应',
          order: 3,
          items: getItemsByCategory('electromagnetic-induction'),
        },
      },
    },
    thermodynamics: {
      id: 'thermodynamics',
      title: '热学',
      order: 3,
      hidden: false,
      categories: {
        'kinetic-theory': {
          id: 'kinetic-theory',
          groupId: 'thermodynamics',
          title: '分子动理论',
          order: 1,
          items: getItemsByCategory('kinetic-theory'),
        },
        'gas-laws': {
          id: 'gas-laws',
          groupId: 'thermodynamics',
          title: '气体定律',
          order: 2,
          items: getItemsByCategory('gas-laws'),
        },
        'thermodynamic-processes': {
          id: 'thermodynamic-processes',
          groupId: 'thermodynamics',
          title: '热力学过程',
          order: 3,
          items: getItemsByCategory('thermodynamic-processes'),
        },
        'heat-transfer': {
          id: 'heat-transfer',
          groupId: 'thermodynamics',
          title: '热传递',
          order: 4,
          items: getItemsByCategory('heat-transfer'),
        },
      },
    },
    optics: {
      id: 'optics',
      title: '光学',
      order: 4,
      hidden: false,
      categories: {
        'geometric-optics': {
          id: 'geometric-optics',
          groupId: 'optics',
          title: '几何光学',
          order: 1,
          items: getItemsByCategory('geometric-optics'),
        },
        lenses: {
          id: 'lenses',
          groupId: 'optics',
          title: '透镜',
          order: 2,
          items: getItemsByCategory('lenses'),
        },
        'wave-optics': {
          id: 'wave-optics',
          groupId: 'optics',
          title: '波动光学',
          order: 3,
          items: getItemsByCategory('wave-optics'),
        },
      },
    },
    modern: {
      id: 'modern',
      title: '近代物理',
      order: 5,
      hidden: false,
      categories: {
        'quantum-mechanics': {
          id: 'quantum-mechanics',
          groupId: 'modern',
          title: '量子力学基础',
          order: 1,
          items: getItemsByCategory('quantum-mechanics'),
        },
        'nuclear-physics': {
          id: 'nuclear-physics',
          groupId: 'modern',
          title: '核物理',
          order: 2,
          items: getItemsByCategory('nuclear-physics'),
        },
      },
    },
  },
}
