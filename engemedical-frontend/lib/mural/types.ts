export interface MuralStyles {
  BACKGROUNDCOLOR?: string;
  TEXTCOLOR?: string;
  BODYTEXTCOLOR?: string;
  FONTFAMILY?: string;
  VIDEOMUTED?: boolean;
}

export interface MuralItem {
  id: string;
  LAYOUTTYPE: 'TEXT_WITH_IMAGE' | 'FULL_IMAGE' | 'VIDEO' | 'WEATHER';
  TITLE?: string;
  BODYTEXT?: string;
  IMAGEURL?: string;
  STYLES: MuralStyles;
  CREATEDBY?: string;
  ACTIVE: boolean;
  CREATEDAT: string;
  UPDATEDAT: string;
}
