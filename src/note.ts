// 用于收集所有音速障碍物类型（以 Kind 为键）
export const NoteType: Record<
  string,
  {
    Coord: string
    Kind: string
    Level: string
    FxSndIndex: string
  }
> = {
  '26': { Coord: '0', Kind: '26', Level: '1', FxSndIndex: '0' }, // 原 leftStar
  '27': { Coord: '0', Kind: '27', Level: '1', FxSndIndex: '0' }, // 原 rightStar
  '19': { Coord: '0', Kind: '19', Level: '2', FxSndIndex: '0' }, // 原 leftSpike
  '18': { Coord: '0', Kind: '18', Level: '2', FxSndIndex: '0' }, // 原 rightSpike
  '16': { Coord: '0', Kind: '16', Level: '3', FxSndIndex: '0' }, // 原 jump
  '17': { Coord: '0', Kind: '17', Level: '3', FxSndIndex: '0' }, // 原 squat
  '22': { Coord: '0', Kind: '22', Level: '4', FxSndIndex: '0' }, // 原 leftSpin
  '23': { Coord: '0', Kind: '23', Level: '4', FxSndIndex: '0' }, // 原 rightSpin
  '20': { Coord: '0', Kind: '20', Level: '5', FxSndIndex: '0' }, // 原 leftTopJump
  '21': { Coord: '0', Kind: '21', Level: '5', FxSndIndex: '0' }, // 原 rightTopJump
  '128': { Coord: '0', Kind: '128', Level: '5', FxSndIndex: '0' }, // 原 leftTopLongJump
  '129': { Coord: '0', Kind: '129', Level: '5', FxSndIndex: '0' },
  '130': { Coord: '0', Kind: '130', Level: '5', FxSndIndex: '0' },
  '131': { Coord: '0', Kind: '131', Level: '5', FxSndIndex: '0' }, // 原 rightTopLongJump
  '132': { Coord: '0', Kind: '132', Level: '5', FxSndIndex: '0' },
  '133': { Coord: '0', Kind: '133', Level: '5', FxSndIndex: '0' },
  '143': { Coord: '0', Kind: '143', Level: '5', FxSndIndex: '0' }, // 原 rightLongDodge
  '144': { Coord: '0', Kind: '144', Level: '5', FxSndIndex: '0' },
  '145': { Coord: '0', Kind: '145', Level: '5', FxSndIndex: '0' },
  '140': { Coord: '0', Kind: '140', Level: '5', FxSndIndex: '0' }, // 原 leftLongDodge
  '141': { Coord: '0', Kind: '141', Level: '5', FxSndIndex: '0' },
  '142': { Coord: '0', Kind: '142', Level: '5', FxSndIndex: '0' },
  '137': { Coord: '0', Kind: '137', Level: '5', FxSndIndex: '0' }, // 原 longSquat
  '138': { Coord: '0', Kind: '138', Level: '5', FxSndIndex: '0' },
  '139': { Coord: '0', Kind: '139', Level: '5', FxSndIndex: '0' },
  '134': { Coord: '0', Kind: '134', Level: '5', FxSndIndex: '0' }, // 原 longJump
  '135': { Coord: '0', Kind: '135', Level: '5', FxSndIndex: '0' },
  '136': { Coord: '0', Kind: '136', Level: '5', FxSndIndex: '0' },
  '24': { Coord: '0', Kind: '24', Level: '4', FxSndIndex: '0' }, // 原 jumpPlatform

  // 特殊处理随机，别问我为什么是161，因为偷来的素材里写的
  '161': { Coord: '0', Kind: '161', Level: '0', FxSndIndex: '0' },
}

/**
 * 同按键进行转换映射，用于处理星星和钉子的映射
 */
export const StarNotetransformMap = {
  '18': '27',
  '19': '26',
  '26': '18',
  '27': '19',
}

/**
 * 镜子模式障碍物映射
 */
export const mirrorModeMap = {
  '26': ['26', '27'], // 原 leftStar
  '27': ['26', '27'], // 原 rightStar
  '19': ['19', '18'], // 原 leftSpike
  '18': ['19', '18'], // 原 rightSpike
  '16': ['16', '17'], // 原 jump
  '17': ['16', '17'], // 原 squat
  '20': ['20', '21'], // 原 leftTopJump
  '21': ['20', '21'], // 原 rightTopJump
  '22': ['22', '23'], // 原 leftSpin
  '23': ['22', '23'], // 原 rightSpin
  '128': ['128', '131'], // 原 leftTopLongJump
  '129': ['129', '132'],
  '130': ['130', '133'],
  '131': ['128', '131'], // 原 rightTopLongJump
  '132': ['129', '132'],
  '133': ['130', '133'],
  '143': ['143', '140'], // 原 rightLongDodge
  '144': ['144', '141'],
  '145': ['145', '142'],
  '140': ['143', '140'], // 原 leftLongDodge
  '141': ['144', '141'],
  '142': ['145', '142'],
  '137': ['137', '134'], // 原 longSquat
  '138': ['138', '135'],
  '139': ['139', '136'],
  '134': ['137', '134'], // 原 longJump
  '135': ['138', '135'],
  '136': ['139', '136'],
  '24': ['24', '24'], // 原 jumpPlatform
}
