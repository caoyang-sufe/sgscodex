    class TavernChessGameManager extends ManagerBase {
        constructor() {
            super(...arguments),
            this.firstEnterTeam = !0,
            this.changEEffectFlag = !1,
            this.reconnectAutoRefreshShop = !1,
            this.lastUseJingNangID = 0,
            this.isParticle = !1,
            this.startLeave = !1,
            this.cachedChessData = [],
            this.canPlay = !0,
            this.bShowSelfEquipWindow = !1,
            this.currentSelectChessOrSpellIndex = -1,
            this.gmCnt = 0,
            this.bGM = !1,
            this.confShopMaxLevel = 0,
            this.dispersionCoinNum = 0,
            this.isReady = !1,
            this.shopOpen = !1,
            this.leadTimeReady = !1,
            this.lockFlag = !1,
            this.buyPrice = 0,
            this.buyIng = !1,
            this.battleStart = !1,
            this.bPlayedEndAni = !1,
            this.testTime = 0,
            this.startFlag = !1,
            this.battleEndTime = 0,
            this.battleStartTime = 0,
            this.isAllGameOver = !1,
            this.isGetAllMsgOver = !1,
            this.fileMsgBuffArr = [],
            this.bGameGameOver = !1,
            this.selfGeneralID = 0,
            this.selfPreGeneralID = 0,
            this.canOperate = !0,
            this.lastLookOnTime = 0,
            this.startLookOnFlag = !1,
            this.needQuiteLookOn = !1,
            this.lastHeartBeatTime = 0,
            this.LineUpApply = !1,
            this.destoryed = !1
        }
        SendEvent(e, ...t) {
            this.event(e, t)
        }
        BattleBack() {
            let e = TavernChessTableManager.GetInstance(),
            t = e.RoomInfo;
            if (t && t.roomID > 0)
                return e.SendReqLobbyChessRoomEnter(t.roomID), void SceneManager.GetInstance().SwitchScene("ChessTableScene");
            if (e.ReconnectRoomID > 0)
                return e.SendReqLobbyChessRoomEnter(e.ReconnectRoomID), void(e.ReconnectRoomID = 0);
            let i = GameContext.GetModeType(),
            s = GameModeConfiger.GetInstance().GetModeUnlockCondition(i);
            !s || s.IsUnlock ? TavernChessGameGuideManager.GetInstance().CheckNeedGuide() ? SceneManager.GetInstance().SwitchScene("TavernChessGuideShowScene") : (RoomControler.GetInstance().EnterMode(GameContext.GetModeType()), GameContext.IsReconnect2 && (GameContext.IsReconnect2 = !1)) : TaskManager.GetInstance().openFunctionWindow(JumpType.MODESCENE)
        }
        AddEventListener() {
            super.AddEventListener(),
            this.firstEnterTeam = !0,
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSGENERALLIST, this, this.onNotifyChessGeneralList),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYSTARTCHOOSEGENERAL, this, this.onNotifyStartChooseGeneral),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYHASCHESSPLAYERCHOOSENUM, this, this.onNotifyHasChessPlayerChooseNum),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSCHOOSEGENERAL, this, this.onRespChessChooseGeneral),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYALLCHESSGENERAL, this, this.onNotifyAllChessGeneral),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSCHOOSEGENERAL, this, this.onNotifyChessChooseGeneral),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSENTERTEAM, this, this.onNotifyChessEnterTeam),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSENTERTEAM, this, this.onRespChessEnterTeam),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSFLUSHINFO, this, this.onRespChessFlushInfo),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPSHOPREFRESHCHESS, this, this.onRespShopRefreshChess),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPTEAMUSERREADY, this, this.onRespTeamUserReady),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPSHOPBUYCHESS, this, this.onRespShopBuyChess),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPSHOPRECYCLECHESS, this, this.onRespShopRecycleChess),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPSHOPLOCK, this, this.onRespShopLock),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPSHOPLEVELUP, this, this.onRespShopLevelUp),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYSELECTTAVERNSPELLLIST, this, this.onNotifySelectTavernSpellList),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSLINEUP, this, this.onRespChessLineUp),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSCOMPOSITE, this, this.onRespChessComposite),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSBATTLESTART, this, this.onNotifyChessBattleStart),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSBATTLEEND, this, this.onNotifyChessBattleEnd),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSGAMERESULT, this, this.onNotifyChessGameResult),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSGAMEOVER, this, this.onNotifyChessGameOver),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPLEAVECHESSTEAM, this, this.onRespLeaveChessTeam),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYTEAMUSERRANK, this, this.onNotifyTeamUserRank),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSSENDEMOTE, this, this.onRespChessSendEmote),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSSENDEMOTE, this, this.onNotifyChessSendEmote),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSGETLASTBATTLEPLAYERDATA, this, this.onRespChessGetLastBattlePlayerData),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSCOMPOSITE, this, this.onNotifyChessComposite),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYLEVELUP, this, this.onNotifyLevelUp),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSTEAMFIRSTKILL, this, this.onNotifyChessTeamFirstKill),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSDOUBLEUSERDAMAGE, this, this.onNotifyChessDoubleUserDamage),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSPLAYERSTATUSCHANGES, this, this.onNotifyChessPlayerStatusChanges),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSCHOOSESKILLTARGET, this, this.onRespChessChooseSkillTarget),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSUSESPELL, this, this.onRespChessUseSpell),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYUSESKILL, this, this.onNotifyUseSkill),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSDATAUPDATE, this, this.onNotifyChessDataUpdate),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSSKILLJUDGERESULT, this, this.onNotifyChessSkillJudgeResult),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYEQUIPMENTCHOOSELIST, this, this.onNotifyEquipmentChooseList),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSCHOOSEEQUIPMENT, this, this.onRespChessChooseEquipment),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSSELECTSPELLID, this, this.CRespChessSelectSpellID),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPSELECTOTHERCHESS, this, this.onRespSelectOtherChess),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSSELECTSPELLCHESS, this, this.onRespChessSelectSpellChess),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSSKILLSELECTSPELLORCHESS, this, this.onRespChessSkillSelectSpellOrChess),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSGAMEENDTIME, this, this.onRespChessGameEndTime),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSGM, this, this.onRespChessGm),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSTEAMMATCHDATA, this, this.onNotifyChessTeamMatchData),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSSENDPROP, this, this.onRespChessSendProp),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSSENDPROP, this, this.onNotifyChessSendProp),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSQUERYBUFF, this, this.onRespChessQueryBuff),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSGENERALINJURED, this, this.onNotifyChessGeneralInjured),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSCREATEGAMEMSG, this, this.onNotifyCreateGameMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSUSESPELLMSG, this, this.onNotifyChessUseSpellMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSDAMAGEMSG, this, this.onNotifyDamageMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSUPDATEHPATTACKMSG, this, this.onNotifyUpdateChessHpAttackMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSUPDATEBUFFMSG, this, this.onNotifyUpdateChessBuffMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSUPDATEINFOMSG, this, this.onNotifyUpdateChessInfoMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFGODCHESSKILLNOTIFY, this, this.onNotifyGodChessKill),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSGAMEOVERMSG, this, this.onNtfChessGameOverMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSGETBASEINFOMSG, this, this.onNotifyChessGetBaseInfoMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSCANCELSPELLMSG, this, this.onNotifyChessCancelSpellMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSALLMSG, this, this.onNotifyChessAllMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSFUTUREBUFF, this, this.onNotifyChessFutureBuff),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSJUDGERESULT, this, this.onNotifyChessJudgeResult),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSRANKMSG, this, this.onNotifyChessRankMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSPASSIVEBUFFMSG, this, this.onNotifyChessPassiveBuffMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSGAMEEVENTMSG, this, this.onNotifyChessGameEventMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSSHOPMSG, this, this.onNotifyChessShopMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSUPDATESKILLMSG, this, this.onNotifyChessUpdateSkillMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSUPDATEOTHERINFOMSG, this, this.onNotifyChessUpdateOtherInfoMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSEQUIPMSG, this, this.onNotifyChessEquipMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFLORDSKILLMSG, this, this.onNotifyLordSkillMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSTUNSHINOTIFY, this, this.onNotifyChessTunShiNotify),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNTFCHESSMISSATTACKMSG, this, this.onNotifyChessMissAttackMsg),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSUSESKILL, this, this.onRespChessUseSkill),
            GameEventDispatcher.GetInstance().on(GameEventDispatcher.STAGE_VISIBILITY, this, this.onStageVisibility),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYENDRECRUIT, this, this.onEndRecruit),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSRECONNECTFINISH, this, this.onReconnectFinish),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSRECONNECTSELECTTAVERNSPELLLIST, this, this.onReconnectSelectTavernSpellList),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSLOOKON, this, this.onRespChessLookOn),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSQUITELOOKON, this, this.onRespChessQuiteLookOn),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSQUITELOOKON, this, this.onNotifyChessQuiteLookOn),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSDELETESPELL, this, this.onRespChessDeleteSpell),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSDELETEEQUIPMENT, this, this.onRespChessDeleteEquipment),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPQUYUANCHOOSEQUESTIONANSWER, this, this.onRespQuYuanChooseQuestionAnswer),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYQUYUANCHOOSEQUESTIONINFO, this, this.onNotifyQuYuanChooseQuestionInfo),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPQUYUANCHOOSEQUESTIONGIFT, this, this.onRespQuYuanChooseQuestionGift),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPDIQINGSELECTSKILL, this, this.onRespDiQingSelectSkill),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CRESPCHESSFOLLOWUP, this, this.onCRespChessFollowUp)
        }
        RemoveEventListener() {
            super.RemoveEventListener(),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSGENERALLIST, this, this.onNotifyChessGeneralList),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYSTARTCHOOSEGENERAL, this, this.onNotifyStartChooseGeneral),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYHASCHESSPLAYERCHOOSENUM, this, this.onNotifyHasChessPlayerChooseNum),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSCHOOSEGENERAL, this, this.onRespChessChooseGeneral),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYALLCHESSGENERAL, this, this.onNotifyAllChessGeneral),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSCHOOSEGENERAL, this, this.onNotifyChessChooseGeneral),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSENTERTEAM, this, this.onNotifyChessEnterTeam),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSENTERTEAM, this, this.onRespChessEnterTeam),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSFLUSHINFO, this, this.onRespChessFlushInfo),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPSHOPREFRESHCHESS, this, this.onRespShopRefreshChess),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPTEAMUSERREADY, this, this.onRespTeamUserReady),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPSHOPBUYCHESS, this, this.onRespShopBuyChess),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPSHOPRECYCLECHESS, this, this.onRespShopRecycleChess),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPSHOPLOCK, this, this.onRespShopLock),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPSHOPLEVELUP, this, this.onRespShopLevelUp),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYSELECTTAVERNSPELLLIST, this, this.onNotifySelectTavernSpellList),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSLINEUP, this, this.onRespChessLineUp),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSCOMPOSITE, this, this.onRespChessComposite),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYTEAMUSERRANK, this, this.onNotifyTeamUserRank),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSSENDEMOTE, this, this.onRespChessSendEmote),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSSENDEMOTE, this, this.onNotifyChessSendEmote),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSGETLASTBATTLEPLAYERDATA, this, this.onRespChessGetLastBattlePlayerData),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSCOMPOSITE, this, this.onNotifyChessComposite),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYLEVELUP, this, this.onNotifyLevelUp),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSTEAMFIRSTKILL, this, this.onNotifyChessTeamFirstKill),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSDOUBLEUSERDAMAGE, this, this.onNotifyChessDoubleUserDamage),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSBATTLESTART, this, this.onNotifyChessBattleStart),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSBATTLEEND, this, this.onNotifyChessBattleEnd),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSGAMERESULT, this, this.onNotifyChessGameResult),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSGAMEOVER, this, this.onNotifyChessGameOver),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPLEAVECHESSTEAM, this, this.onRespLeaveChessTeam),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSPLAYERSTATUSCHANGES, this, this.onNotifyChessPlayerStatusChanges),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSCHOOSESKILLTARGET, this, this.onRespChessChooseSkillTarget),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSUSESPELL, this, this.onRespChessUseSpell),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYUSESKILL, this, this.onNotifyUseSkill),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSDATAUPDATE, this, this.onNotifyChessDataUpdate),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSSKILLJUDGERESULT, this, this.onNotifyChessSkillJudgeResult),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYEQUIPMENTCHOOSELIST, this, this.onNotifyEquipmentChooseList),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSCHOOSEEQUIPMENT, this, this.onRespChessChooseEquipment),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSSELECTSPELLID, this, this.CRespChessSelectSpellID),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPSELECTOTHERCHESS, this, this.onRespSelectOtherChess),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSGAMEENDTIME, this, this.onRespChessGameEndTime),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSSELECTSPELLCHESS, this, this.onRespChessSelectSpellChess),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSSKILLSELECTSPELLORCHESS, this, this.onRespChessSkillSelectSpellOrChess),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSGM, this, this.onRespChessGm),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSTEAMMATCHDATA, this, this.onNotifyChessTeamMatchData),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSSENDPROP, this, this.onRespChessSendProp),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSSENDPROP, this, this.onNotifyChessSendProp),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSQUERYBUFF, this, this.onRespChessQueryBuff),
            this.proxy.AddEventListener(ProtoBufId.CMSG_CNOTIFYCHESSGENERALINJURED, this, this.onNotifyChessGeneralInjured),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSCREATEGAMEMSG, this, this.onNotifyCreateGameMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSUSESPELLMSG, this, this.onNotifyChessUseSpellMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSDAMAGEMSG, this, this.onNotifyDamageMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSUPDATEHPATTACKMSG, this, this.onNotifyUpdateChessHpAttackMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSUPDATEBUFFMSG, this, this.onNotifyUpdateChessBuffMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSUPDATEINFOMSG, this, this.onNotifyUpdateChessInfoMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFGODCHESSKILLNOTIFY, this, this.onNotifyGodChessKill),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSGAMEOVERMSG, this, this.onNtfChessGameOverMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSGETBASEINFOMSG, this, this.onNotifyChessGetBaseInfoMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSCANCELSPELLMSG, this, this.onNotifyChessCancelSpellMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSALLMSG, this, this.onNotifyChessAllMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSFUTUREBUFF, this, this.onNotifyChessFutureBuff),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSJUDGERESULT, this, this.onNotifyChessJudgeResult),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSRANKMSG, this, this.onNotifyChessRankMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSPASSIVEBUFFMSG, this, this.onNotifyChessPassiveBuffMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSGAMEEVENTMSG, this, this.onNotifyChessGameEventMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSSHOPMSG, this, this.onNotifyChessShopMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSUPDATESKILLMSG, this, this.onNotifyChessUpdateSkillMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSUPDATEOTHERINFOMSG, this, this.onNotifyChessUpdateOtherInfoMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSEQUIPMSG, this, this.onNotifyChessEquipMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFLORDSKILLMSG, this, this.onNotifyLordSkillMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSTUNSHINOTIFY, this, this.onNotifyChessTunShiNotify),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNTFCHESSMISSATTACKMSG, this, this.onNotifyChessMissAttackMsg),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSUSESKILL, this, this.onRespChessUseSkill),
            GameEventDispatcher.GetInstance().off(GameEventDispatcher.STAGE_VISIBILITY, this, this.onStageVisibility),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYENDRECRUIT, this, this.onEndRecruit),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSRECONNECTFINISH, this, this.onReconnectFinish),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSRECONNECTSELECTTAVERNSPELLLIST, this, this.onReconnectSelectTavernSpellList),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSLOOKON, this, this.onRespChessLookOn),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSQUITELOOKON, this, this.onRespChessQuiteLookOn),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYCHESSQUITELOOKON, this, this.onNotifyChessQuiteLookOn),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSDELETESPELL, this, this.onRespChessDeleteSpell),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSDELETEEQUIPMENT, this, this.onRespChessDeleteEquipment),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPQUYUANCHOOSEQUESTIONANSWER, this, this.onRespQuYuanChooseQuestionAnswer),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CNOTIFYQUYUANCHOOSEQUESTIONINFO, this, this.onNotifyQuYuanChooseQuestionInfo),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPQUYUANCHOOSEQUESTIONGIFT, this, this.onRespQuYuanChooseQuestionGift),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPDIQINGSELECTSKILL, this, this.onRespDiQingSelectSkill),
            this.proxy.RemoveEventListener(ProtoBufId.CMSG_CRESPCHESSFOLLOWUP, this, this.onCRespChessFollowUp)
        }
        onNotifyChessGeneralList(e) {
            if (!e)
                return;
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol.ProtoData;
            if (this.chessMinionTypList = t.chessMinionTypList, this.endChooseGeneralStageTime = t.stageEndTime, this.isParticle = t.isPractise, this.teamInfo = t.teamInfo, t.doubleTeamUserIDs) {
                this.friendMap || (this.friendMap = new Map);
                for (let e in t.doubleTeamUserIDs)
                    this.friendMap.set(Number(e), t.doubleTeamUserIDs[e]), this.friendMap.set(t.doubleTeamUserIDs[e], Number(e))
            }
            TavernChessGameContext.IsReconnect ? (this.cachedChessGeneralListProxy = e, TavernChessGameContext.ReconnectPhase = TavernChessPhaseType.CHESSTSelectStart, TavernChessGameContext.CanSelectGeneral = t.readyEndTime - TimerManager.GetInstance().ServerTime <= 0) : WindowManager.GetInstance().GetWindow("TavernChessSelectGeneralWindow").Show(t)
        }
        onNotifyStartChooseGeneral() {
            TavernChessGameContext.CanSelectGeneral = !0,
            this.event(TavernChessGameManager.NOTIFY_START_SELECT)
        }
        get SelectInfo() {
            return this.selectInfo
        }
        get ServerSelectInfoList() {
            return this.serverSelectInfoList
        }
        onNotifyHasChessPlayerChooseNum(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = 0,
            s = t.ProtoData.userNum,
            a = t.ProtoData.generals;
            this.serverSelectInfoList = [];
            for (const e in a)
                if (Object.prototype.hasOwnProperty.call(a, e)) {
                    let t = a[e];
                    this.serverSelectInfoList.push(t),
                    t.generalID && !t.isPreselection && i++
                }
            this.selectInfo = {
                hasChooseNum: i,
                userNum: s
            },
            this.event(TavernChessGameManager.RESP_SELECT_GENERAL_SURE_NUM, [i, s]),
            this.event(TavernChessGameManager.RESP_SELECT_GENERAL_USER_LIST, [this.serverSelectInfoList])
        }
        ReqChessChooseGeneral(e, t) {
            TavernChessConfiger.GetInstance().CheckHaveGeneralByGeneralID(e) && (this.selfGeneralID || this.CheckGeneralAlive(e) && (this.CheckGeneralHasOtherSureSelect(e) || this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSCHOOSEGENERAL, {
                        tableID: this.TableID,
                        generalID: e,
                        isPreselection: t
                    })))
        }
        CheckGeneralAlive(e, t = !0) {
            let i = TavernChessConfiger.GetInstance().GetGeneralByGeneralID(e);
            return !!i && ((!i.RequiredMinionTyp || !this.ChessMinionTypList || -1 != this.ChessMinionTypList.indexOf(i.RequiredMinionTyp)) && (!t || !this.FriendUID || 1001 != e))
        }
        CheckGeneralHasOtherSureSelect(e) {
            if (this.serverSelectInfoList && this.serverSelectInfoList.length)
                for (let t = 0; t < this.serverSelectInfoList.length; t++) {
                    let i = this.serverSelectInfoList[t];
                    if (i && i.generalID == e && !i.isPreselection && i.userID != TavernChessGameContext.SelfUserID)
                        return !0
                }
            return !1
        }
        onRespChessChooseGeneral(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void(500076 != t.errCode && UIUtils.ShowProtocolResult(t.errCode));
            let i = t.ProtoData.generalID,
            s = t.ProtoData.isPreselection;
            s ? this.selfPreGeneralID = i : this.selfGeneralID = i,
            this.event(TavernChessGameManager.RESP_SELECT_GENERAL, [i, s])
        }
        onNotifyAllChessGeneral(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.generalInfo;
            this.inSeatGeneralInfo = i;
            for (const e in i)
                if (Object.prototype.hasOwnProperty.call(i, e)) {
                    let t = i[e].generalID,
                    s = parseInt(e);
                    s == TavernChessGameContext.SelfUserID && (this.selfGeneralID = t),
                    this.updateHeadInfoGeneralID(s, t)
                }
            TavernChessGameContext.IsReconnect && (TavernChessGameContext.ReconnectPhase = TavernChessPhaseType.CHESSShowAllGeneral),
            this.event(TavernChessGameManager.ANI_SELECT_GENERAL_SHOW_LIST, [this.inSeatGeneralInfo])
        }
        onNotifyChessChooseGeneral(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol,
            i = t.ProtoData.preGeneralID,
            s = t.ProtoData.generalID;
            this.selfPreGeneralID = i,
            this.selfGeneralID = s
        }
        CheckIsFriend(e) {
            let t = TavernChessGameContext.SelfUserID;
            if (this.friendMap) {
                if (this.friendMap.get(t) == e)
                    return !0
            }
            return !(!this.selfInfo || this.selfInfo.doubleTeamUserID != e)
        }
        get FriendUID() {
            let e = TavernChessGameContext.SelfUserID;
            if (this.friendMap) {
                return this.friendMap.get(e)
            }
            return this.selfInfo && this.selfInfo.doubleTeamUserID ? this.selfInfo.doubleTeamUserID : 0
        }
        GetFriendByUID(e) {
            if (this.friendMap) {
                let t = this.friendMap.get(e);
                if (t)
                    return t
            }
            return 0
        }
        GetSelectGeneralInfoByUId(e) {
            if (this.inSeatGeneralInfo)
                return this.inSeatGeneralInfo[e]
        }
        addCachedData(e) {
            this.cachedChessData || (this.cachedChessData = []),
            this.cachedChessData.push(e)
        }
        onNotifyChessEnterTeam(e, t = !1) {
            if (!e)
                return;
            if (!this.checkMsg(e))
                return;
            let i = e.Protocol;
            TavernChessGameContext.IsReconnect || TavernChessGameContext.IsGuideLastStage ? (this.firstEnterTeam = !1, TavernChessGameContext.ReconnectPhase = TavernChessPhaseType.StartRecruit, this.ReconnectChessEnterTeam(e)) : this.bPlayedEndAni || !this.phase || this.phase == TavernChessPhaseType.StartRecruit || this.phase == TavernChessPhaseType.InRecruit || t ? (this.updateEnterTeamData(i, 1), !t && this.firstEnterTeam ? this.event(TavernChessGameManager.ANI_SELECT_GENERAL_FLY) : (TavernChessGameContext.HasFight && (TavernChessGameContext.StopBattle(), TavernChessGameContext.ClearQueue(), this.SendEvent(TavernChessGameManager.JUMP_GAME_OVER)), this.Phase = TavernChessPhaseType.StartRecruit, this.selfLordSkillData = null, this.enmyLordSkillData = null)) : this.addCachedData(e)
        }
        PlayWheel() {
            TavernChessGameContext.IsViewer || this.wheelRandChess && this.wheelRandChess.length && WindowManager.GetInstance().GetWindow("TavernChessWheelWindow").Show()
        }
        EndWheel() {
            this.wheelRandChess = null,
            this.wheelChessList = null
        }
        AddWheelCard(e) {
            this.WheelRandChessInfo ? (this.WheelRandChessInfo.forEach(e => {
                    this.selfInfo.AddHandChess(e)
                }), this.event(TavernChessGameManager.ANI_ADD_HAND_CARD, [this.WheelRandChessInfo, e, !0])) : WindowManager.GetInstance().CloseWindow("TavernChessWheelWindow")
        }
        ReconnectChessEnterTeam(e) {
            let t = e.Protocol,
            i = TavernChessGameContext.IsGuideLastStage;
            if (i) {
                let e = t.ProtoData;
                TavernChessGameContext.TableID = e.tableID,
                TavernChessGameContext.IsGuideLastStage = !1
            }
            if (this.updateEnterTeamData(t, 1), this.dealSelectCard(), this.playerList.forEach(e => {
                    this.updateHeadInfoGeneralID(e.userID, e.generalID)
                }), this.Phase = TavernChessPhaseType.InRecruit, this.event(TavernChessGameManager.RESP_RECONNECT), TavernChessGameGuideManager.GetInstance().IsLastStage && 1 == this.CurRound) {
                let e = 0;
                (this.ShopCurLevel < 5 || i) && (e = GuideStepEnum.NEW_TAVERN_CHESS_STEP_3_1),
                e || this.CoinNum > 6 && (e = GuideStepEnum.NEW_TAVERN_CHESS_STEP_3_2);
                let t = TavernChessConfiger.GetInstance().GetGeneralByGeneralID(this.GeneralID),
                s = TavernChessConfiger.GetInstance().GetGeneralSkillBySkillID(t ? t.GeneralSkill : 0),
                a = TavernChessZhuGongSkillManager.GetInstance().GetInstanceClass(s, this.SelfInfo);
                if (a && !a.Activated && (e = GuideStepEnum.NEW_TAVERN_CHESS_STEP_3_8), !e) {
                    let t = this.BattleChess,
                    i = t ? t.length : 0;
                    5 == i ? e = GuideStepEnum.NEW_TAVERN_CHESS_STEP_3_7 : 4 == i && (e = GuideStepEnum.NEW_TAVERN_CHESS_STEP_3_6)
                }
                if (!e) {
                    let t = this.HandCardCnt;
                    2 == t ? e = GuideStepEnum.NEW_TAVERN_CHESS_STEP_3_5 : 1 == t && this.shopGoods[1] ? e = GuideStepEnum.NEW_TAVERN_CHESS_STEP_3_4 : 1 != t || this.shopGoods[1] ? 0 == t && (e = GuideStepEnum.NEW_TAVERN_CHESS_STEP_3_3) : e = GuideStepEnum.NEW_TAVERN_CHESS_STEP_3_6
                }
                e && (GuideManager.GetInstance().NextGuideID = e, GuideManager.GetInstance().ShowNextGuide())
            }
        }
        onReconnectFinish(e) {
            if (this.checkMsg(e)) {
                switch (this.reconnectAutoRefreshShop = !0, TavernChessGameContext.IsReconnect = !1, TavernChessGameContext.ReconnectPhase) {
                case TavernChessPhaseType.CHESSTSelectStart:
                    this.onNotifyChessGeneralList(this.cachedChessGeneralListProxy);
                    break;
                case TavernChessPhaseType.CHESSShowAllGeneral:
                    let e = this.headInfoList ? this.headInfoList.length : 0,
                    t = {
                        stageEndTime: this.endChooseGeneralStageTime,
                        generalPoolGeneralIDs: [this.selfGeneralID],
                        chessMinionTypList: this.ChessMinionTypList,
                        userNum: e
                    };
                    this.selectInfo = {
                        hasChooseNum: e,
                        userNum: e
                    },
                    WindowManager.GetInstance().GetWindow("TavernChessSelectGeneralWindow").Show(t);
                    break;
                case TavernChessPhaseType.StartRecruit:
                    this.event(TavernChessGameManager.UI_UPDATE_TOP_HEAD_LATEST),
                    this.event(TavernChessGameManager.UI_UPDATE_BATTLE_PLAYER)
                }
                TavernChessGameContext.ReconnectPhase = 0,
                TavernChessGameContext.IsViewer && (this.startLookOnFlag = !1, this.PlayEnterNotify()),
                TavernChessGameGuideManager.GetInstance().CheckNeedGuide() && (TavernChessGameGuideManager.GetInstance().IsLastStage = !0),
                TavernChessLineupManager.GetInstance().InitBattleUserInfo(),
                TavernChessLineupManager.GetInstance().CalculateScore()
            }
        }
        onReconnectSelectTavernSpellList(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol,
            i = t.ProtoData.perSelectSpellID,
            s = t.ProtoData.spellIDs,
            a = [];
            for (let e = 0; e < s.length; e++) {
                let t = s[e],
                n = {
                    CardVO: TavernChessConfiger.GetInstance().GetCardByCardID(t),
                    ServerInfo: null,
                    isSelect: i == t
                };
                a.push(n)
            }
            this.AddWaitSelectCards(a)
        }
        ReqChessGetLastBattlePlayerData(e) {
            if (e)
                if (this.isAllGameOver) {
                    let t = this.getLastRoundPlayerByUID(e);
                    this.event(TavernChessGameManager.UI_UPDATE_GENERAL_TIPS, t)
                } else {
                    let t = TavernChessGameContext.IsInbattle,
                    i = this.CurRound;
                    t && (i -= 1),
                    i < 1 && (i = 1),
                    this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSGETLASTBATTLEPLAYERDATA, {
                        tableID: this.TableID,
                        userID: e,
                        turn: i,
                        battle: t
                    })
                }
        }
        onRespChessGetLastBattlePlayerData(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.player;
            this.updateLastRoundPlayer(i),
            this.event(TavernChessGameManager.UI_UPDATE_GENERAL_TIPS, i)
        }
        onNotifyChessComposite(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = {
                uid: t.ProtoData.userID,
                type: 3,
                chessID: t.ProtoData.chessID
            };
            this.emojiList || (this.emojiList = []),
            this.emojiList.push(i),
            this.checkSendEmojiEvent()
        }
        onNotifyLevelUp(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = {
                uid: t.ProtoData.userID,
                type: 2,
                level: t.ProtoData.level
            };
            this.emojiList || (this.emojiList = []),
            this.emojiList.push(i),
            this.checkSendEmojiEvent()
        }
        onNotifyChessTeamFirstKill(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            this.firstKillFromUserGeneralID = t.ProtoData.killFromUserGeneralID;
            t.ProtoData.killFromUserNickname
        }
        get FirstKillFromUserGeneralID() {
            return this.firstKillFromUserGeneralID
        }
        PlayFirstKillAni() {
            if (this.firstKillFromUserGeneralID) {
                let e = SceneManager.GetInstance().CurrentScene;
                return e && e.PlayFirstKillAni(this.firstKillFromUserGeneralID),
                this.firstKillFromUserGeneralID = 0,
                !0
            }
            return !1
        }
        ReqChessEnterTeam() {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSENTERTEAM, {
                tableID: this.TableID
            })
        }
        onRespChessEnterTeam(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            t.errCode ? UIUtils.ShowProtocolResult(t.errCode) : (WindowManager.GetInstance().CloseAllWindow(), this.updateEnterTeamData(t, 2), this.firstEnterTeam = !1, this.battleStart || this.bGM || (this.Phase = TavernChessPhaseType.StartRecruit), this.bGM && this.event(TavernChessGameManager.RESP_GM), this.bGM = !1, this.debugFrequency(t))
        }
        ReqChessFlushInfo() {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSFLUSHINFO, {
                tableID: this.TableID
            })
        }
        onRespChessFlushInfo(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            t.errCode ? UIUtils.ShowProtocolResult(t.errCode) : (this.updatePlayer(t.ProtoData.owner), this.event(TavernChessGameManager.UI_UPDATE_SHOP_REFRESH_COST))
        }
        debugFrequency(e) {
            if (!ClientConfiger.GetInstance().IsDebug)
                return;
            let t = e.ProtoData.frequency,
            i = e.ProtoData.matchResult;
            const s = t.length,
            a = (e, t = " ") => this.padLeft(e, 6, t);
            console.log(`%c=============== 第${this.CurRound}轮频率分表 ===============`, "color: green;");
            let n = a("  ");
            for (const e of t)
                n += a(this.getPlayerName(e.playerID), "  ");
            console.log("%c" + n, "color: green;");
            for (const e of t) {
                let t = a(this.getPlayerName(e.playerID) + "");
                for (let i = 0; i < s + 1; i++)
                    t += a(e.score[i], "  ");
                console.log("%c" + t, "color: green;")
            }
            i.forEach(e => {
                let t = e.split("  "),
                i = t[0];
                t[1].split(",").forEach(e => {
                    let t = e.split("-vs-"),
                    s = t[0],
                    a = t[1],
                    n = this.getPlayerName(s),
                    r = this.getPlayerName(a);
                    i += " " + n + "  vs  " + r
                }),
                console.log("%c" + i, "color: green;")
            })
        }
        calcColWidth(e) {
            let t = 0;
            for (const i of e) {
                t = Math.max(t, i.playerID.toString().length);
                for (const e of i.score)
                    null != e && (t = Math.max(t, String(e).length))
            }
            return Math.max(t + 2, 6)
        }
        getPlayerName(e) {
            let t = e.split("_")[1],
            i = this.getLastRoundPlayerByUID(Number(t)),
            s = i ? i.generalID : 0,
            a = TavernChessConfiger.GetInstance().GetGeneralByGeneralID(s);
            return a ? a.GeneralName : ""
        }
        padLeft(e, t, i = " ") {
            if ((e = String(e)).length >= t)
                return e;
            let s = "";
            for (let a = 0; a < t - e.length; a++)
                s += i;
            return s + e
        }
        updateEnterTeamData(e, t) {
            let i,
            s = e.ProtoData.owner,
            a = e.ProtoData.otherPlayer,
            n = e.ProtoData.teamInfo,
            r = e.ProtoData.shopGoods,
            l = e.ProtoData.stageEndTime,
            h = (e.ProtoData.equipments, e.ProtoData.useSpellIDs ? e.ProtoData.useSpellIDs.slice() : []),
            o = 1 == t;
            if (o && (this.useDelaySpellInfo = e.ProtoData.useDelaySpellInfo ? e.ProtoData.useDelaySpellInfo.slice() : [], this.allGetMoneySpellCount = e.ProtoData.allGetMoneySpellCount, this.useDelaySpellInfo.sort((e, t) => t.turns - e.turns), i = this.dealSpellIDs(h, this.useDelaySpellInfo)), !TavernChessGameContext.IsViewer) {
                if (e.ProtoData.wheelChessList && e.ProtoData.wheelChessList.length > 0) {
                    let t = [...e.ProtoData.wheelChessList];
                    if (this.wheelChessList = [], t && t.length) {
                        let e = [];
                        t.forEach(t => {
                            let i = TavernChessConfiger.GetInstance().GetCardByCardID(t),
                            s = i.GetMinionTyp(null);
                            i && -1 == e.indexOf(s) && e.push(s)
                        });
                        let i = TavernChessConfiger.GetInstance().GetWheelPrizePool(e);
                        for (let e = 0; e <= 7; ++e) {
                            let s = i["Position" + (e + 1)];
                            t.some((e, i) => {
                                if (TavernChessConfiger.GetInstance().GetCardByCardID(e).GetMinionTyp(null) == s)
                                    return t.splice(i, 1), this.wheelChessList.push(e), !0
                            })
                        }
                    }
                }
                if (this.wheelRandChess = e.ProtoData.wheelRandChess, this.wheelRandChess && this.wheelRandChess.length > 0 && this.firstEnterTeam) {
                    this.wheelRandChessInfo = [];
                    let e = [],
                    t = [...this.wheelRandChess];
                    if (s.Chess) {
                        for (let i in s.Chess) {
                            let a = s.Chess[i],
                            n = t.indexOf(a.chessID);
                            n >= 0 ? (this.wheelRandChessInfo.push(a), t.slice(n, 1)) : e.push(a)
                        }
                        s.Chess = e
                    }
                }
            }
            if (this.updatePlayer(s), this.updateLastRoundPlayer(s), a && a.length)
                for (let e = 0; e < a.length; e++) {
                    let t = a[e];
                    this.updatePlayer(t),
                    this.updateLastRoundPlayer(t)
                }
            this.teamInfo = n;
            if (this.updateShopGoods(r, !1), this.stageEndTime = l, this.battlePlayerInfo = this.GetChessPlayerByUID(s.thisRoundBatterUserID), o && (this.activeUseSpellIDs = i), this.updateHeadInfoHp(s.userID, s.hp), a && a.length)
                for (let e = 0; e < a.length; e++) {
                    let t = a[e];
                    t && this.updateHeadInfoHp(t.userID, t.hp)
                }
            this.sortHealList(),
            this.event(TavernChessGameManager.UI_UPDATE_TOP_HEAD_LATEST),
            this.event(TavernChessGameManager.UI_UPDATE_BATTLE_SPELL_INIT),
            TavernChessGameContext.IsViewer && this.dealSelectCard(),
            Laya.timer.once(10, this, this.updateEffectTurnsUpdate),
            TavernChessLineupManager.GetInstance().CalculateScore(),
            this.reconnectAutoRefreshShop && this.ReqShopRefreshChess(!0)
        }
        get TableID() {
            return TavernChessGameContext.TableID
        }
        get Phase() {
            return this.phase
        }
        set Phase(e) {
            this.phase != e && (this.phase != TavernChessPhaseType.InBattle && this.phase != TavernChessPhaseType.EndBattle || e != TavernChessPhaseType.StartRecruit && e != TavernChessPhaseType.InRecruit || this.ReqShopRefreshChess(!0), this.phase == TavernChessPhaseType.EndRecruit && e == TavernChessPhaseType.StartRecruit && this.ReqShopRefreshChess(!0), this.phase = e, this.checkSanLianReq(), this.checkSanLianAni(), this.checkSendEmojiEvent(), e != TavernChessPhaseType.InBattle && e != TavernChessPhaseType.EndBattle && (this.enemyPlayerInfo = null, this.selfUserInfo = null), TavernChessPhaseType.StartBattle, e == TavernChessPhaseType.InBattle && Laya.stage.isVisibility && TavernChessGameContext.StartBattle(), e == TavernChessPhaseType.InRecruit && (this.isReady = !1), this.event(TavernChessGameManager.GAME_PHASE_CHANGED), e == TavernChessPhaseType.InRecruit && (this.CanPlay = !0, this.playSrartRecruitChessData(), this.checkBingLiangAct()))
        }
        get FirstEnterTeam() {
            return this.firstEnterTeam
        }
        set FirstEnterTeam(e) {
            this.firstEnterTeam = e
        }
        get SelfInfo() {
            return this.selfInfo
        }
        ClearLineupChess() {
            this.selfUserInfo && (this.selfUserInfo.Chess = null),
            this.selfInfo && this.selfInfo.ClearLineupChess()
        }
        get HP() {
            return this.selfInfo ? this.selfInfo.hp : 0
        }
        UpdateHP(e, t = !1) {
            this.selfInfo && this.selfInfo.hp != e && (this.selfInfo.hp = e, this.event(TavernChessGameManager.UI_UPDATE_SELF_HP, t))
        }
        get HPLimit() {
            return this.selfInfo ? this.selfInfo.hpLimit : 0
        }
        get IsFirstMove() {
            return !!this.selfInfo && this.selfInfo.isFistMove
        }
        get CurRound() {
            return TavernChessGameReplayManager.GetInstance().IsReplay ? TavernChessGameReplayManager.GetInstance().Turn : this.teamInfo ? this.teamInfo.turn : 1
        }
        get IsPractise() {
            return this.isParticle || !!this.teamInfo && this.teamInfo.isPractise
        }
        get IsNewUser() {
            return Boolean(this.teamInfo && this.teamInfo.chessNewUserCustomGameConfID)
        }
        get HandChess() {
            return this.selfInfo ? this.selfInfo.HandChess : null
        }
        get HandCardCnt() {
            return this.selfInfo && this.selfInfo.HandChess ? this.selfInfo.HandChess.length : 0
        }
        GetHandChessByGoodID(e) {
            let t,
            i = this.HandChess;
            return i && i.some(i => {
                if (i.goodsID == e)
                    return t = i, !0
            }),
            t
        }
        CheckOwnedChess(e) {
            let t = this.HandChess,
            i = TavernChessConfiger.GetInstance().GetCardByCardID(e);
            if (!i)
                return !1;
            if (t)
                for (let s = 0; s < t.length; s++)
                    if (t[s] && (t[s].chessID == e || i.RelateUpgradeChessID == t[s].chessID))
                        return !0;
            let s = this.selfInfo.LineUpChess;
            if (s)
                for (let t = 0; t < s.length; t++)
                    if (s[t] && (s[t].chessID == e || i.RelateUpgradeChessID == s[t].chessID))
                        return !0;
            return !1
        }
        get BattleChess() {
            return this.Phase == TavernChessPhaseType.InBattle && this.selfUserInfo ? this.selfUserInfo.Chess : this.selfInfo ? this.selfInfo.LineUpChess : null
        }
        get SelfUserIndexID() {
            return this.selfUserInfo ? this.selfUserInfo.UserIndexID : 255
        }
        get SelfUserID() {
            return this.selfUserInfo ? this.selfUserInfo.UserID : 0
        }
        get EnemyUserIndexID() {
            return this.enemyPlayerInfo ? this.enemyPlayerInfo.UserIndexID : 255
        }
        get EnemyShopLevel() {
            return this.enemyPlayerInfo ? this.enemyPlayerInfo.shopLevel : 0
        }
        get GeneralID() {
            return this.selfInfo ? this.selfInfo.generalID : null
        }
        get Equipments() {
            return this.selfInfo ? this.selfInfo.equipments : null
        }
        CheckHasS3CiXioingShuangGuJian() {
            let e = this.Equipments;
            return e && e.some((e, t) => {
                let i = TavernChessConfiger.GetInstance().GetEquipByEquipID(e.equipmentID),
                s = i ? i.WeaponSkill : 0,
                a = TavernChessConfiger.GetInstance().GetEquipSkillBySkillID(s);
                if (a && a.WeaponSkillNameType == TavernChessWeaponSkillNameType.CWSNTS3CiXiongShuangGuJian)
                    return !0
            })
        }
        AddSelfEquipment(e) {
            if (!this.selfInfo)
                return;
            this.selfInfo.equipments || (this.selfInfo.equipments = []);
            let t = !1;
            this.selfInfo.equipments.some((i, s) => {
                let a = e.equipmentID,
                n = TavernChessConfiger.GetInstance().GetEquipByEquipID(a),
                r = TavernChessConfiger.GetInstance().GetEquipByEquipID(i.equipmentID);
                if (n && r && r.WeaponType == n.WeaponType)
                    return this.selfInfo.equipments[s] = e, t = !0, !0
            }),
            t || this.selfInfo.equipments.push(e)
        }
        get DisableEquipTypes() {
            return []
        }
        get BattlePlayerInfo() {
            return this.battlePlayerInfo
        }
        get BattleSelfHP() {
            return this.selfUserInfo ? this.selfUserInfo.CurHp : null
        }
        get EnemyEquipments() {
            return this.battlePlayerInfo ? this.battlePlayerInfo.equipments : null
        }
        get EnemyGeneralID() {
            return this.battlePlayerInfo ? this.battlePlayerInfo.generalID : null
        }
        get EnemyHP() {
            return this.enemyPlayerInfo ? this.enemyPlayerInfo.CurHp : null
        }
        get EnemyChess() {
            return TavernChessGameContext.BShowGuidePolit ? [TavernChessGameGuideManager.GetInstance().CreateLvBuChess()] : this.enemyPlayerInfo ? this.enemyPlayerInfo.Chess : null
        }
        get ChessMinionTypList() {
            return this.chessMinionTypList
        }
        get StageEndTime() {
            return this.stageEndTime
        }
        get ActiveUseSpellIDs() {
            return this.activeUseSpellIDs
        }
        get InitiativeSkillTimes() {
            return this.selfInfo && this.selfInfo.chessPlayerSkillInfo ? this.selfInfo.chessPlayerSkillInfo.initiativeSkillTimes : 0
        }
        set InitiativeSkillTimes(e) {
            this.selfInfo && this.selfInfo.chessPlayerSkillInfo && e != this.selfInfo.chessPlayerSkillInfo.initiativeSkillTimes && (this.selfInfo.chessPlayerSkillInfo.initiativeSkillTimes = e, this.event(TavernChessGameManager.INITIATIVE_SKILL_TIMES_CHANGED))
        }
        get WheelChessList() {
            return this.wheelChessList
        }
        get WheelRandChess() {
            return this.wheelRandChess
        }
        get WheelRandChessInfo() {
            return this.wheelRandChessInfo
        }
        get CantBuyShopTurn() {
            return this.selfInfo && this.selfInfo.chessPlayerSkillInfo ? this.selfInfo.chessPlayerSkillInfo.cantBuyShopTurn : 0
        }
        get TriggerFangQuanTimes() {
            return this.selfInfo && this.selfInfo.chessPlayerSkillInfo ? this.selfInfo.chessPlayerSkillInfo.triggerFangQuanTimes : 0
        }
        get LuBanSKillHasSelectRound() {
            return this.selfInfo && this.selfInfo.chessPlayerSkillInfo ? this.selfInfo.chessPlayerSkillInfo.luBanSKillHasSelectRound : null
        }
        get ExtraSkillUpgradeCost() {
            return this.selfInfo && this.selfInfo.chessPlayerSkillInfo ? this.selfInfo.chessPlayerSkillInfo.extraSkillUpgradeCost : 0
        }
        get SkillReduceCost() {
            return this.selfInfo && this.selfInfo.chessPlayerSkillInfo ? this.selfInfo.chessPlayerSkillInfo.TriggerSkillReduceCost : 0
        }
        set ExtraSkillUpgradeCost(e) {
            this.selfInfo && this.selfInfo.chessPlayerSkillInfo && e != this.selfInfo.chessPlayerSkillInfo.extraSkillUpgradeCost && (this.selfInfo.chessPlayerSkillInfo.extraSkillUpgradeCost = e, this.event(TavernChessGameManager.UI_UPDATE_COIN_NUM))
        }
        get RefreshShopFree() {
            return !(!this.selfInfo || !this.selfInfo.chessPlayerSkillInfo) && this.selfInfo.chessPlayerSkillInfo.refreshShopFree
        }
        set RefreshShopFree(e) {
            this.selfInfo && this.selfInfo.chessPlayerSkillInfo && e != this.selfInfo.chessPlayerSkillInfo.refreshShopFree && (this.selfInfo.chessPlayerSkillInfo.refreshShopFree = e, this.event(TavernChessGameManager.UI_UPDATE_SHOP_REFRESH_COST))
        }
        get ReFreshShopReduceCost() {
            return !(!this.selfInfo || !this.selfInfo.chessPlayerSkillInfo) && this.selfInfo.chessPlayerSkillInfo.refreshShopFree ? this.selfInfo.chessPlayerSkillInfo.TriggerSkillReduceCost : 0
        }
        get ChangEEffectFlag() {
            return this.changEEffectFlag
        }
        set ChangEEffectFlag(e) {
            this.changEEffectFlag = e
        }
        GetFutureChess(e, t) {
            return t && this.selfFutureChess ? this.selfFutureChess.get(e) : !t && this.enemyFutureChess ? this.enemyFutureChess.get(e) : null
        }
        ReqLeaveChessTeam() {
            this.isAllGameOver ? (TavernChessGameContext.IsLeave = !0, TavernChessGameContext.StopBattle(), WindowManager.GetInstance().CloseAllWindow(), this.event(TavernChessGameManager.RESP_LEAVE_GAME)) : (this.startLeave = !0, this.proxy.SendProto(ProtoBufId.CMSG_CREQLEAVECHESSTEAM, {
                    tableID: this.TableID
                }))
        }
        onRespLeaveChessTeam(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return this.startLeave = !1, void UIUtils.ShowProtocolResult(t.errCode);
            TavernChessGameContext.IsLeave || (TavernChessGameContext.IsLeave = !0, TavernChessGameContext.StopBattle(), this.event(TavernChessGameManager.RESP_LEAVE_GAME))
        }
        onNotifyTeamUserRank(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            this.lastHPMap || (this.lastHPMap = new Map),
            this.serverRankDataList && this.serverRankDataList.forEach(e => {
                e && this.lastHPMap.set(e.userID, e.hp ? e.hp : 0)
            });
            let i = t.ProtoData.userRank;
            this.serverRankDataList = [],
            ObjUtil.deepCopy(i, this.serverRankDataList);
            let s = i ? i.length : 0;
            for (let e = 0; e < s; e++) {
                let t = i[e];
                if (t && t.userID)
                    if (t.initRank = e, t.hpLimit = TavernChessGameContext.GetReplayHpLimit(t.userID), this.phase == TavernChessPhaseType.StartRecruit || this.phase == TavernChessPhaseType.InRecruit) {
                        this.updateHeadInfo(t.userID, t);
                        let e = this.GetChessPlayerByUID(t.userID);
                        e && (e.hp = t.hp);
                        let i = this.getLastRoundPlayerByUID(t.userID);
                        i && (i.hp = t.hp)
                    } else
                        this.updateHeadInfoExcludeHp(t.userID, t)
            }
            this.sortHealList(),
            this.phase != TavernChessPhaseType.StartRecruit && this.phase != TavernChessPhaseType.InRecruit || this.event(TavernChessGameManager.UI_UPDATE_TOP_HEAD_LATEST),
            WindowManager.GetInstance().hasWindow("TavernChessSelectGeneralWindow") && this.event(TavernChessGameManager.UI_UPDATE_TOP_HEAD_LATEST_SELECT_GENERAL, [i]),
            this.event(TavernChessGameManager.UI_UPDATE_TOP_HEAD_LOOKON)
        }
        onNotifyChessPlayerStatusChanges(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.owenUerId,
            s = t.ProtoData.changeUserId,
            a = t.ProtoData.chessPlayerHp,
            n = t.ProtoData.shopLevel,
            r = t.ProtoData.shopUpLevelCost;
            i == s ? (this.UpdateHP(a, !1), this.ShopCurLevel = n, this.ShopLevelUpCost = r) : this.battlePlayerInfo && this.battlePlayerInfo.userID == s && (this.battlePlayerInfo.hp = a, this.battlePlayerInfo.shopLevel = n, this.battlePlayerInfo.shopLevelUpCost = r),
            this.playerList.some(e => {
                if (e.userID == s)
                    return e.hp = a, e.shopLevel = n, e.shopLevelUpCost = r, !0
            }),
            i != s && this.event(TavernChessGameManager.UI_UPDATE_TOP_HEAD_LATEST)
        }
        ReqChessUseSkill(e, t = 0, i = [], s = [], a = !1) {
            this.CanOperate && this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSUSESKILL, {
                tableID: this.TableID,
                skillID: e,
                chessMinionTyp: t,
                goodsID: i,
                chessID: s,
                buy: a
            })
        }
        onRespChessUseSkill(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return UIUtils.ShowProtocolResult(t.errCode), void this.event(TavernChessGameManager.SELECT_CHESS_FAIL);
            let i = t.ProtoData.shopGoods,
            s = t.ProtoData.skillGetChess;
            i && i.length > 0 ? this.updateShopGoods(i, !0) : s && s.length,
            WindowManager.GetInstance().CloseWindow("TavernChessSelectChessWindow"),
            WindowManager.GetInstance().CloseWindow("TavernChessSelectHandCardWindow")
        }
        ReqChessFollowUp(e, t) {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSFOLLOWUP, {
                tableID: this.TableID,
                goodsID: e,
                followUpGoodsID: t
            })
        }
        onCRespChessFollowUp(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            if (t.errCode)
                return UIUtils.ShowProtocolResult(t.errCode), WindowManager.GetInstance().hasWindow("TavernChessSelectChessWindow") || this.event(TavernChessGameManager.RESP_CHESS_FOLLOW_UP, [0]), void this.event(TavernChessGameManager.SELECT_CHESS_FAIL);
            let i = t.ProtoData.followUpGoodsID;
            this.event(TavernChessGameManager.RESP_CHESS_SPELL_USE, [i]),
            WindowManager.GetInstance().CloseWindow("TavernChessSelectChessWindow")
        }
        ReqChessChooseSkillTarget(e, t, i) {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSCHOOSESKILLTARGET, {
                tableID: this.TableID,
                goodsID: e,
                skillID: t,
                skillGoodsID: i
            })
        }
        onRespChessChooseSkillTarget(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            if (t.errCode)
                return this.event(TavernChessGameManager.SELECT_CHESS_FAIL), void UIUtils.ShowProtocolResult(t.errCode);
            WindowManager.GetInstance().CloseWindow("TavernChessSelectChessWindow"),
            TavernChessGameContext.LineFlag = !0,
            this.ReqChessLineUp(TavernChessGameContext.LineUpArr, !0),
            TavernChessGameContext.LineUpChess = null,
            TavernChessGameContext.LineUpArr = null
        }
        ReqChessUseSpell(e, t) {
            TavernChessGameGuideManager.GetInstance().IsGuide ? TavernChessGameGuideManager.GetInstance().ChessUseSpell(e, this.TableID) : TavernChessGameContext.CheckSuWuCantOpt() ? UIUtils.ShowTextPrompt(words.TAVERN_CHESS_OPERATE_ERROR_6) : this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSUSESPELL, {
                tableID: this.TableID,
                spellGoodsID: e,
                targets: t
            })
        }
        onRespChessUseSpell(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            if (t.errCode)
                return UIUtils.ShowProtocolResult(t.errCode), WindowManager.GetInstance().hasWindow("TavernChessSelectChessWindow") || this.event(TavernChessGameManager.RESP_CHESS_SPELL_USE, [0]), void this.event(TavernChessGameManager.SELECT_CHESS_FAIL);
            let i = t.ProtoData.spellGoodsID,
            s = this.GetHandChessByGoodID(i);
            if (s) {
                let e = TavernChessConfiger.GetInstance().GetCardByCardID(s.chessID);
                this.LastUseJingNangID = e && e.ChessSkill[0] ? e.ChessSkill[0] : 0
            }
            let a = t.ProtoData.useSpellIDs ? t.ProtoData.useSpellIDs.slice() : [];
            this.deleteHandGoods(i),
            this.event(TavernChessGameManager.RESP_CHESS_SPELL_USE, [i]),
            this.useDelaySpellInfo = t.ProtoData.useDelaySpellInfo ? t.ProtoData.useDelaySpellInfo.slice() : [],
            this.allGetMoneySpellCount = t.ProtoData.allGetMoneySpellCount,
            this.useDelaySpellInfo.sort((e, t) => t.turns - e.turns);
            let n = this.dealSpellIDs(a, this.useDelaySpellInfo);
            WindowManager.GetInstance().CloseWindow("TavernChessSelectChessWindow");
            let r = n.reverse(),
            l = this.ActiveUseSpellIDs || [],
            h = [];
            for (let e = 0; e < r.length; e++)
                if (l[e]) {
                    let t = l[e].spellID,
                    i = r[e].spellID,
                    s = r[e].turn,
                    a = l[e].turn;
                    (t != i || s != a) && h.push(r[e])
                } else
                    h.push(r[e]);
            this.activeUseSpellIDs = n;
            for (let e = 0; e < h.length; e++) {
                let t = h[e];
                this.event(TavernChessGameManager.UI_UPDATE_BATTLE_SPELL_ADD, t)
            }
            Laya.timer.once(10, this, this.updateEffectTurnsUpdate)
        }
        dealSpellIDs(e, t) {
            if (!e || !t)
                return;
            let i,
            s,
            a = TavernChessConfiger.GetInstance(),
            n = e.length,
            r = 0,
            l = [],
            h = 0,
            o = new Dictionary,
            d = new Dictionary,
            c = 0;
            for (let S = n; S > 0; S--) {
                if (r = e[S - 1], i = a.GetSpellEffectTypeBySpellID(r), i == TavernChessSpellSkillEffectType.CHESSSSETAllGetMoney) {
                    c = r;
                    continue
                }
                if (i != TavernChessSpellSkillEffectType.CHESSSSETDelayChess && i != TavernChessSpellSkillEffectType.CHESSSSETDelayCopy) {
                    l.push({
                        spellID: r,
                        turn: 0
                    });
                    continue
                }
                if (h >= t.length)
                    continue;
                if (o.has(r)) {
                    let e = o.getNumberKey(r);
                    o.addNumberKey(r, e + 1)
                } else
                    o.addNumberKey(r, 1);
                let n = o.getNumberKey(r);
                s = this.getSpellDelayInfo(t, r, n),
                s && (d.has(`${r}_${s.turns}`) || (d.addStringKey(`${r}_${s.turns}`, !0), l.push({
                            spellID: r,
                            turn: s.turns
                        })), h++)
            }
            return c && this.allGetMoneySpellCount && l.push({
                spellID: c,
                turn: 0
            }),
            l
        }
        getSpellDelayInfo(e, t, i) {
            let s,
            a = 1;
            return e.some(e => {
                if (e.spellID == t) {
                    if (a == i)
                        return s = e, !0;
                    a++
                }
            }),
            s
        }
        updateEffectTurnsUpdate() {
            this.event(TavernChessGameManager.SPELL_EFFECT_TURNS_UPDATE)
        }
        onNotifyUseSkill(e) {
            if (!this.checkMsg(e))
                return;
            TavernChessGameContext.IsInbattle ? this.addCachedData(e) : this.DealUesSkill(e)
        }
        DealUesSkill(e, t = !1) {
            let i = e.Protocol,
            s = i.ProtoData.skillID,
            a = i.ProtoData.useSkillTyp,
            n = i.ProtoData.fromGoodsID,
            r = i.ProtoData.toGoodsID;
            switch (a) {
            case TavernChessClientSkillEnum.ZHUGONG:
                this.event(TavernChessGameManager.GENERAL_SKILL_TRIGGER, [s]);
                break;
            case TavernChessClientSkillEnum.ZHUANGBEI:
                this.event(TavernChessGameManager.ANI_ACTIVE_EQUIP_SKILL, s);
                break;
            case TavernChessClientSkillEnum.JINGNANG:
                this.event(TavernChessGameManager.TEAM_SPELL_USE, [s, r]);
                break;
            case TavernChessClientSkillEnum.CHESS:
                this.event(TavernChessGameManager.TEAM_CHESS_SKILL_USE, [s, a, n, r]),
                t = !1
            }
            t && (this.CanPlay = !0, this.PlayChessDataUpdate())
        }
        onNotifyChessDataUpdate(e) {
            if (!this.checkMsg(e))
                return;
            TavernChessGameContext.IsInbattle ? this.addCachedData(e) : this.DealChessDataUpdate(e)
        }
        onNotifyChessSkillJudgeResult(e) {
            if (!this.checkMsg(e))
                return;
            TavernChessGameContext.IsInbattle ? this.addCachedData(e) : this.dealSkillJudgeResult(e)
        }
        DealChessDataUpdate(e, t = !1, i = TavernChessDealDataFromType.NONE) {
            let s = e.Protocol,
            a = s.ProtoData.skillID,
            n = s.ProtoData.useSkillTyp,
            r = s.ProtoData.chessBaseInfo,
            l = s.ProtoData.chessUpdateInfo,
            h = s.ProtoData.chessEquipmentInfo,
            o = s.ProtoData.skillInfo,
            d = s.ProtoData.chessDataUpdateTyp,
            c = this.ShopLevelUpCost;
            if (!this.selfInfo)
                return;
            let S = TavernChessConfiger.GetInstance().GetChessSkillBySkillID(a);
            switch (d) {
            case TavernChessDataUpdateType.emChessDataUpdateTypBase:
                let e = this.dealBasePlayerInfo(r, i, !1, n, a);
                t = t ? e : t;
                break;
            case TavernChessDataUpdateType.emChessDataUpdateTypChessUpdate:
                let s = !0;
                if (this.phase == TavernChessPhaseType.InRecruit && n == TavernChessClientSkillEnum.CHESS && S && S.TriggerTyp == TavernChessTriggerType.CHESSTTInitialize && (s = !1), !s)
                    break;
                this.selfInfo.UpdateChessData(l),
                this.selfInfo.DeleteChess && this.selfInfo.DeleteChess.length && (this.event(TavernChessGameManager.TEAM_CHESS_DELETE_CHESS, [a, n, this.selfInfo.DeleteChess]), t = !1),
                this.selfInfo.GoldChess && this.selfInfo.GoldChess.length && (this.event(TavernChessGameManager.TEAM_CHESS_CHANGE_TO_GOLD, [a, n, this.selfInfo.GoldChess]), t = !1),
                this.selfInfo.NewLyChess && this.selfInfo.NewLyChess.length && (this.event(TavernChessGameManager.TEAM_CHESS_NEWLY_CHESS, [a, n, this.selfInfo.NewLyChess]), t = !1),
                this.selfInfo.ChageChess && this.selfInfo.ChageChess.length && (this.event(TavernChessGameManager.TEAM_CHESS_INFO_UPDATE, [a, n, this.selfInfo.ChageChess]), t = !1),
                this.selfInfo.ChangeSpell && this.selfInfo.ChangeSpell.length && this.event(TavernChessGameManager.TEAM_SUIJIYINGBIAN, [this.selfInfo.ChangeSpell]);
                let d = !1;
                this.selfInfo.DeleteHandChess && this.selfInfo.DeleteHandChess.length && (TavernChessGameContext.AddCardQueue({
                        type: TavernChessAnimationType.DELETE_CARD,
                        srcSkill: a,
                        params: this.selfInfo.DeleteHandChess
                    }), d = !0);
                let u = !1;
                if (S && S.TriggerTyp == TavernChessTriggerType.CHESSTTGetCard && this.buyIng)
                    break;
                if (this.selfInfo.NewLyHandChess && this.selfInfo.NewLyHandChess.length && (this.selfInfo.NewLyHandChess.forEach(e => {
                            -1 != this.deleteShopGoods(e.goodsID) && (u = !0)
                        }), u && this.event(TavernChessGameManager.GENERAL_SKILL_TRIGGER_SHOP), TavernChessGameContext.AddCardQueue({
                            type: TavernChessAnimationType.CARD_TO_HAND,
                            srcSkill: a,
                            params: this.selfInfo.NewLyHandChess
                        }), d = !0), d && this.event(TavernChessGameManager.UI_UPDATE_HAND_CARD_NUM), l.shopChessList && l.shopChessList.length > 0 && i != TavernChessDealDataFromType.RECRUIT) {
                    let e = this.shopGoods ? this.shopGoods.length : 0,
                    t = e != l.shopChessList.length,
                    i = t,
                    s = !1,
                    r = [];
                    if (!t)
                        for (let a = 0; a < e; ++a) {
                            let e = this.shopGoods[a],
                            n = l.shopChessList[a],
                            h = e ? e.goodsID : 0,
                            o = n ? n.goodsID : 0;
                            if (u || h || e == o || (i = !0), !u && h != o) {
                                t = !0,
                                n.totalHp == n.hp && n.totalAttack == n.attack || r.push(n.goodsID);
                                break
                            }
                            if (e)
                                for (let t in e)
                                    if (n && e[t] != n[t]) {
                                        if (s = !0, "totalHp" == t || "totalAttack" == t) {
                                            r.push(n.goodsID);
                                            break
                                        }
                                    } else
                                        n || (s = !0)
                        }
                    if (!i)
                        if (n == TavernChessClientSkillEnum.JINGNANG) {
                            TavernChessConfiger.GetInstance().GetSpellEffectTypeBySkillID(a) == TavernChessSpellSkillEffectType.CHESSSSETZhiJiZhiBi && (i = !0)
                        } else if (n == TavernChessClientSkillEnum.ZHUGONG) {
                            let e = TavernChessConfiger.GetInstance().GetGeneralSkillBySkillID(a);
                            e && (e.SkillEffectType != TavernChessGeneralSkillEffectType.CHESSGSETYangYuhuan && e.SkillEffectType != TavernChessGeneralSkillEffectType.CHESSGSETChange || (i = !0, this.changEEffectFlag = e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETChange))
                        } else if (n == TavernChessClientSkillEnum.ZHUANGBEI) {
                            let e = TavernChessConfiger.GetInstance().GetEquipSkillBySkillID(a);
                            e && e.WeaponSkillNameType == TavernChessWeaponSkillNameType.CWSNTDaYuan && (i = !0)
                        }
                    this.updateShopGoods(l.shopChessList, t, i),
                    s && this.event(TavernChessGameManager.GENERAL_SKILL_TRIGGER_SHOP, [r]),
                    this.checkSanLianAni()
                }
                TavernChessGameContext.StartCardQueue(),
                TavernChessLineupManager.GetInstance().CalculateScore();
                break;
            case TavernChessDataUpdateType.emChessDataUpdateTypEquipment:
                this.selfInfo.UpdateEquipData(h),
                this.event(TavernChessGameManager.UI_UPDATE_EQUIP_SKILL_PROGRESS);
                break;
            case TavernChessDataUpdateType.emChessDataUpdateTypSkill:
                if (!this.selfInfo)
                    break;
                let I = this.InitiativeSkillTimes,
                g = this.TriggerFangQuanTimes,
                p = this.RefreshShopFree,
                T = this.ReFreshShopReduceCost,
                C = this.SkillReduceCost,
                m = this.FreeRefreshEndTime,
                f = this.selfInfo.chessPlayerSkillInfo ? this.selfInfo.chessPlayerSkillInfo.diQingSelectSkillTurn : 0,
                G = this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.functionParam ? this.selfInfo.chessPlayerSkillInfo.functionParam[TavernChessFunctionVariableType.CFVTCurGameGeneralHurtTime] : 0;
                this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.lordSkillData;
                this.selfInfo.UpdateSkillData(o),
                I == this.InitiativeSkillTimes && g == this.TriggerFangQuanTimes && C == this.SkillReduceCost || this.event(TavernChessGameManager.INITIATIVE_SKILL_TIMES_CHANGED),
                p == this.RefreshShopFree && T == this.ReFreshShopReduceCost || this.event(TavernChessGameManager.UI_UPDATE_SHOP_REFRESH_COST),
                c != this.ShopLevelUpCost && this.event(TavernChessGameManager.UI_UPDATE_SHOP_LEVELUP_COST),
                m != this.FreeRefreshEndTime && this.event(TavernChessGameManager.UI_UPDATE_FREE_REFRESH_END_TIME),
                this.selfInfo.chessPlayerSkillInfo && f != this.selfInfo.chessPlayerSkillInfo.diQingSelectSkillTurn && this.event(TavernChessGameManager.UI_UPDATE_DING_QING_TURN),
                this.selfInfo.chessPlayerSkillInfo && G != this.selfInfo.chessPlayerSkillInfo.functionParam[TavernChessFunctionVariableType.CFVTCurGameGeneralHurtTime] && this.event(TavernChessGameManager.UI_UPDATE_BENGHUAI);
                let y = this.selfInfo.chessPlayerSkillInfo.quYuanQuestionExpireTime - TimerManager.GetInstance().ServerTime;
                this.selfInfo.chessPlayerSkillInfo.quYuanQuestionID > 0 && y > 0 && WindowManager.GetInstance().GetWindow("TavernChessLiSaoWindow").Show(this.selfInfo.chessPlayerSkillInfo.quYuanQuestionID, y),
                this.dealSelectCard()
            }
            n == TavernChessUseSkillType.CUSTChessEquipment && this.event(TavernChessGameManager.ANI_ACTIVE_EQUIP_SKILL, a),
            t && (this.CanPlay = !0, this.PlayChessDataUpdate())
        }
        dealBasePlayerInfo(e, t, i = !1, s = 0, a = 0) {
            let n = !0,
            r = this.CoinNum,
            l = this.HP,
            h = this.HPLimit,
            o = this.GeneralID,
            d = this.ShopRefreshCost,
            c = this.selfInfo.changeHandNum,
            S = this.selfInfo.shopLock,
            u = this.ShopLevelUpCost;
            this.selfInfo.UpdateBaseData(e),
            (t == TavernChessDealDataFromType.RECRUIT || this.lockFlag) && (this.selfInfo.shopLock = S),
            r != this.CoinNum && this.event(TavernChessGameManager.UI_UPDATE_COIN_NUM),
            o != this.GeneralID && this.event(TavernChessGameManager.UI_UPDATE_GENERAL);
            let I = l - this.HP;
            if (h != this.HPLimit || l != this.HP || this.injuredArr && this.injuredArr.length > 0) {
                let e = !1;
                if (l > this.HP || this.injuredArr && this.injuredArr.length > 0) {
                    let t = this.injuredArr && this.injuredArr.length ? this.injuredArr.shift() : null;
                    if (t && (0 == t.damageHP || I > 0)) {
                        e = !0,
                        n = !1,
                        this.event(TavernChessGameManager.GENERAL_INJURED, [t.srcGoodsID, t.damageHP, l, s, a]);
                        let i = t ? t.damageHP : 0;
                        for (; i < I && t; )
                            t = this.injuredArr && this.injuredArr.length ? this.injuredArr.shift() : null, t && (this.event(TavernChessGameManager.GENERAL_INJURED, [t.srcGoodsID, t.damageHP, l - i, s, a]), i += t ? t.damageHP : 0)
                    } else
                        i && I ? (e = !0, n = !1, this.event(TavernChessGameManager.GENERAL_DOUBLE_HURT, [I, l])) : I && (e = !0, this.event(TavernChessGameManager.GENERAL_INJURED, [null, I, l, s, a]))
                }
                h > this.HPLimit && (e || this.event(TavernChessGameManager.ANI_ZHUGONG_HURT, [null, I, l])),
                (l < this.HP || h < this.HPLimit) && this.event(TavernChessGameManager.UI_UPDATE_SELF_HP, !0)
            }
            return d != this.ShopRefreshCost && this.event(TavernChessGameManager.UI_UPDATE_SHOP_REFRESH_COST),
            c != this.selfInfo.changeHandNum && this.event(TavernChessGameManager.UI_UPDATE_HAND_CARD_LIMIT),
            u != this.ShopLevelUpCost && this.event(TavernChessGameManager.UI_UPDATE_SHOP_LEVELUP_COST),
            S != this.ShopLock && this.event(TavernChessGameManager.UI_UPDATE_SHOP_LOCK),
            n
        }
        dealSkillJudgeResult(e, t = !1) {
            let i = e.Protocol,
            s = i.ProtoData.userID,
            a = i.ProtoData.goodsID,
            n = i.ProtoData.skillID,
            r = i.ProtoData.result;
            this.event(TavernChessGameManager.TEAM_CHESS_JUDGE, [s, a, n, r]),
            t && (this.CanPlay = !0, this.PlayChessDataUpdate())
        }
        dealSelectCard() {
            let e = [];
            if (this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.selectChess && !this.selfInfo.selectChessSame && (this.selfInfo.chessPlayerSkillInfo.selectChess.forEach(t => {
                        let i = t.chessID || t.spellID,
                        s = {
                            CardVO: TavernChessConfiger.GetInstance().GetCardByCardID(i),
                            ServerInfo: t
                        };
                        e.push(s)
                    }), e && e.length > 0 && this.AddWaitSelectCards(e)), this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.selectOtherChess) {
                this.waitSelectChessDic || (this.waitSelectChessDic = new Dictionary),
                this.waitSelectChessDic.destroy();
                let e = this.selfInfo.chessPlayerSkillInfo.selectOtherChess;
                for (let t in e)
                    if ((!this.waitSelectedGeneralIndexArr || -1 == this.waitSelectedGeneralIndexArr.indexOf(t)) && this.currentSelectOtherChessUserID != t) {
                        let i = e[t].chess;
                        this.waitSelectChessDic.add(t, i)
                    }
                !this.WaitSelectCards && this.waitSelectChessDic.count && this.PlaySelectOtherChess()
            }
            this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.chessList && (this.waitSelectChessChessDic || (this.waitSelectChessChessDic = new Dictionary), this.selfInfo.chessPlayerSkillInfo.chessList.forEach((e, t) => {
                    e.selectChess && e.selectChess.length > 0 && (!this.waitSelectedChessIndexArr || -1 == this.waitSelectedChessIndexArr.indexOf(t)) && this.waitSelectChessChessDic.add(t, e.selectChess)
                }), !this.WaitSelectCards && this.waitSelectChessChessDic.count && this.PlaySelectOtherChess()),
            this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.spellList && (this.waitSelectChessSpellDic || (this.waitSelectChessSpellDic = new Dictionary), this.selfInfo.chessPlayerSkillInfo.spellList.forEach((e, t) => {
                    this.waitSelectedSpellIndexArr && -1 != this.waitSelectedSpellIndexArr.indexOf(t) || this.waitSelectChessSpellDic.add(t, e.spells)
                }), !this.WaitSelectCards && this.waitSelectChessSpellDic.count && this.PlaySelectOtherChess()),
            this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.diQingSelectSkill && this.selfInfo.chessPlayerSkillInfo.diQingSelectSkill.length > 0 && this.event(TavernChessGameManager.UI_UPDATE_SELECT_CARD)
        }
        set CanPlay(e) {
            this.canPlay = e
        }
        PlayChessDataUpdate() {
            if (this.canPlay)
                if (this.cachedChessData && this.cachedChessData.length) {
                    this.CanPlay = !1;
                    let e = this.cachedChessData.shift();
                    e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYUSESKILL ? this.DealUesSkill(e, !0) : e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSENTERTEAM ? this.onNotifyChessEnterTeam(e, !0) : e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSBATTLESTART ? (TavernChessGameContext.Speed = 1, this.dealNotifyCHessBattleStart(e)) : e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSSKILLJUDGERESULT ? this.dealSkillJudgeResult(e, !0) : e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSGENERALINJURED ? this.dealGeneralInjured(e) : e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSDOUBLEUSERDAMAGE ? this.dealChessDoubleUserDamage(e, !0) : this.DealChessDataUpdate(e, !0, TavernChessDealDataFromType.RECRUIT)
                } else
                    this.CanPlay = !0, this.CheckSanLianAni(), this.CheckNextSanLianReq()
        }
        playSrartRecruitChessData() {
            for (; this.cachedChessData && this.cachedChessData.length; ) {
                let e = this.cachedChessData.shift();
                e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYUSESKILL ? this.DealUesSkill(e) : e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSSKILLJUDGERESULT ? this.dealSkillJudgeResult(e) : e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSGENERALINJURED ? this.dealGeneralInjured(e) : e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSDOUBLEUSERDAMAGE ? this.dealChessDoubleUserDamage(e) : this.DealChessDataUpdate(e, !1, TavernChessDealDataFromType.RECRUIT)
            }
            this.CheckSanLianAni(),
            this.CheckNextSanLianReq()
        }
        JumpChessData() {
            for (; this.cachedChessData && this.cachedChessData.length; ) {
                this.CanPlay = !1;
                let e = this.cachedChessData.shift();
                if (e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYUSESKILL);
                else {
                    if (e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSBATTLESTART) {
                        TavernChessGameContext.Speed = 1,
                        this.dealNotifyCHessBattleStart(e),
                        this.CanPlay = !0;
                        break
                    }
                    if (e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSDATAUPDATE) {
                        let t = e.Protocol,
                        i = t.ProtoData.chessBaseInfo,
                        s = t.ProtoData.chessUpdateInfo,
                        a = t.ProtoData.chessEquipmentInfo,
                        n = t.ProtoData.skillInfo,
                        r = t.ProtoData.chessDataUpdateTyp;
                        if (!this.selfInfo)
                            return;
                        switch (r) {
                        case TavernChessDataUpdateType.emChessDataUpdateTypBase:
                            this.selfInfo.UpdateBaseData(i);
                            break;
                        case TavernChessDataUpdateType.emChessDataUpdateTypChessUpdate:
                            this.selfInfo.UpdateChessData(s);
                            break;
                        case TavernChessDataUpdateType.emChessDataUpdateTypEquipment:
                            this.selfInfo.UpdateEquipData(a);
                            break;
                        case TavernChessDataUpdateType.emChessDataUpdateTypSkill:
                            this.selfInfo.UpdateSkillData(n)
                        }
                    }
                }
            }
        }
        ClearCachedChessData() {
            this.cachedChessData = []
        }
        PlaySkillChessDataUpdate(e, t) {
            if (this.cachedChessData && this.cachedChessData.length) {
                let i = this.cachedChessData[0],
                s = i.Protocol.ProtoData.skillID,
                a = i.Protocol.ProtoData.useSkillTyp;
                s == e && a == t && (i.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYUSESKILL ? (this.DealUesSkill(i), this.cachedChessData.splice(0, 1), this.PlaySkillChessDataUpdate(e, t)) : i.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSDATAUPDATE && (this.DealChessDataUpdate(i), this.cachedChessData.splice(0, 1), this.PlaySkillChessDataUpdate(e, t)))
            } else
                this.CanPlay = !0
        }
        PlayEnterNotify() {
            if (TavernChessGameReplayManager.GetInstance().IsReplay)
                return;
            let e = Date.now() - this.testTime;
            if (console.log("实际游戏时间", e), TavernChessGameContext.SendLog(1), this.battleEndProtoData && this.battleEndProtoData.gameOver)
                TavernChessGameContext.IsViewer && !this.NeedQuiteLookOn ? this.ReqChessLookOn(0) : TavernChessGameContext.IsTeamTavern && this.battleEndProtoData && this.battleEndProtoData.isDoubleEscapeDead ? (UIUtils.ShowTextPrompt(words.TAVERN_CHESS_FRIEND_LEAVE_TIP, TextPromptEnum.NORMAL, 2e3), Laya.timer.once(2e3, this, () => {
                        WindowManager.GetInstance().GetWindow("TavernChessGameOverWindow").Show()
                    })) : (WindowManager.GetInstance().GetWindow("TavernChessGameOverWindow").Show(), LogManager.GetInstance().SendLog(LogEventIdType.TAVERN_CHESS_BATTLE_TIME, {
                        time: e
                    }), TavernChessGameGuideManager.GetInstance().IsAiGuide && LogManager.GetInstance().SendLog(LogEventIdType.TAVERN_CHESS_GUIDE_6, {
                        turn: this.CurRound
                    }));
            else if (this.cachedChessData)
                for (; this.cachedChessData.length; ) {
                    let e = this.cachedChessData.shift();
                    if (e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYUSESKILL)
                        this.DealUesSkill(e);
                    else if (e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSSKILLJUDGERESULT)
                        this.dealSkillJudgeResult(e);
                    else if (e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSGENERALINJURED)
                        this.dealGeneralInjured(e);
                    else if (e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSDOUBLEUSERDAMAGE)
                        this.dealChessDoubleUserDamage(e);
                    else {
                        if (e.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSENTERTEAM) {
                            this.onNotifyChessEnterTeam(e, !0);
                            break
                        }
                        this.DealChessDataUpdate(e, !1)
                    }
                }
            else
                this.CanPlay = !0
        }
        get WaitSelectEquiments() {
            return this.waitSelectEquiments
        }
        set WaitSelectEquiments(e) {
            this.waitSelectEquiments = e,
            this.event(TavernChessGameManager.UI_UPDATE_SELECT_CARD)
        }
        get WaitSelectCards() {
            return this.waitSelectCards
        }
        AddWaitSelectCards(e) {
            this.waitSelectCardArr || (this.waitSelectCardArr = []),
            this.waitSelectCardArr.push(e),
            this.WaitSelectCards || this.PlaySelectOtherChess()
        }
        set WaitSelectCards(e) {
            this.waitSelectCards = e,
            this.checkSanLianAni(),
            this.event(TavernChessGameManager.UI_UPDATE_SELECT_CARD)
        }
        addSelectedIndexOrID(e, t) {
            switch (e) {
            case 1:
                this.waitSelectedSpellIndexArr || (this.waitSelectedSpellIndexArr = []),
                this.waitSelectedSpellIndexArr.push(t);
                break;
            case 2:
                this.waitSelectedChessIndexArr || (this.waitSelectedChessIndexArr = []),
                this.waitSelectedChessIndexArr.push(t);
                break;
            case 3:
                this.waitSelectedGeneralIndexArr || (this.waitSelectedGeneralIndexArr = []),
                this.waitSelectedGeneralIndexArr.push(t)
            }
        }
        onNotifyEquipmentChooseList(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol.ProtoData.equipments;
            this.WaitSelectEquiments = t
        }
        onNotifySelectTavernSpellList(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.spellIDs,
            s = [];
            for (let e = 0; e < i.length; e++) {
                let t = i[e],
                a = {
                    CardVO: TavernChessConfiger.GetInstance().GetCardByCardID(t),
                    ServerInfo: null
                };
                s.push(a)
            }
            this.AddWaitSelectCards(s)
        }
        ReqChessChooseEquipment(e, t) {
            TavernChessGameContext.IsViewer || this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSCHOOSEEQUIPMENT, {
                tableID: this.TableID,
                equipmentID: e,
                isPreselection: t
            })
        }
        onRespChessChooseEquipment(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.equipmentID,
            s = t.ProtoData.isPreselection;
            s ? TavernChessGameContext.IsViewer && this.event(TavernChessGameManager.RESP_CHOOSE_EQUIP, [i, s]) : (this.AddSelfEquipment({
                    equipmentID: i
                }), this.waitSelectEquiments = null, this.event(TavernChessGameManager.RESP_CHOOSE_EQUIP, i), this.event(TavernChessGameManager.UI_UPDATE_SELECT_CARD))
        }
        ReqChessSelectSpellID(e, t) {
            this.currentSelectChessOrSpellIndex >= 0 ? this.ReqChessSkillSelectSpellOrChess(this.currentSelectChessOrSpellIndex, t, TavernChessBuffSelectType.CBSETSpell, 0, e) : this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSSELECTSPELLID, {
                tableID: this.TableID,
                spellID: e,
                isPreselection: t
            })
        }
        CRespChessSelectSpellID(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.isPreselection,
            s = t.ProtoData.spell;
            i ? TavernChessGameContext.IsViewer && this.event(TavernChessGameManager.RESP_CHOOSE_CARD, [s, !0]) : (this.selfInfo.AddHandChess(s), this.event(TavernChessGameManager.RESP_CHOOSE_CARD, s), this.dealSelectWindow(i, s.spellID))
        }
        PlaySelectOtherChess() {
            if (this.waitSelectCardArr && this.waitSelectCardArr.length > 0)
                this.WaitSelectCards = this.waitSelectCardArr.shift();
            else {
                if (!this.WaitSelectCards) {
                    let e;
                    if (this.waitSelectChessDic && (this.waitSelectChessDic.breakForEach((t, i) => {
                                if (t)
                                    return this.currentSelectOtherChessUserID = t, e = i, !0
                            }), this.currentSelectOtherChessUserID && (this.waitSelectChessDic.del(this.currentSelectOtherChessUserID), this.addSelectedIndexOrID(3, this.currentSelectOtherChessUserID))), this.currentSelectOtherChessUserID && e) {
                        let t = [];
                        for (let i in e) {
                            let s = e[i],
                            a = {
                                CardVO: TavernChessConfiger.GetInstance().GetCardByCardID(s.chessID),
                                ServerInfo: s
                            };
                            t.push(a)
                        }
                        this.WaitSelectCards = t
                    } else
                        this.currentSelectOtherChessUserID = "", this.WaitSelectCards = null
                }
                let e = this.playSelectChessOrSpell(this.waitSelectChessChessDic, 2);
                if (e || (e = this.playSelectChessOrSpell(this.waitSelectChessSpellDic, 1)), !e && this.isDealEquipJingNang()) {
                    let e = this.Equipments.filter(e => e.equipmentID > 0);
                    e && e.length > 1 && (this.bShowSelfEquipWindow = !0, WindowManager.GetInstance().GetWindow("TavernChessSelectSelfEquipWindow").Show()),
                    this.lastUseJingNangID = 0
                }
            }
        }
        isDealEquipJingNang() {
            if (this.lastUseJingNangID > 0) {
                let e = TavernChessConfiger.GetInstance().GetChessSpellSkillVO(this.lastUseJingNangID);
                return !!e && e.SkillEffectType == TavernChessSpellSkillEffectType.CHESSSSETWeaponToChess
            }
            return !!(this.selfInfo && this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.needDeleteEquip)
        }
        get BShowSelfEquipWindow() {
            return this.bShowSelfEquipWindow
        }
        playSelectChessOrSpell(e, t) {
            let i;
            if (!this.WaitSelectCards) {
                if (e) {
                    let s = -1;
                    e.breakForEach((e, t) => {
                        if (t && t.length > 0)
                            return s = Number(e), i = t, !0
                    }),
                    s >= 0 && (this.currentSelectChessOrSpellIndex = s, e.del(this.currentSelectChessOrSpellIndex), this.addSelectedIndexOrID(t, this.currentSelectChessOrSpellIndex))
                }
                if (this.currentSelectChessOrSpellIndex >= 0 && i) {
                    let e = [];
                    return i.forEach(t => {
                        let i,
                        s;
                        "number" == typeof t ? (i = TavernChessConfiger.GetInstance().GetCardByCardID(t), s = {
                                CardVO: i,
                                ServerInfo: null
                            }) : (i = TavernChessConfiger.GetInstance().GetCardByCardID(t.chessID), s = {
                                CardVO: i,
                                ServerInfo: t
                            }),
                        e.push(s)
                    }),
                    this.WaitSelectCards = e,
                    !0
                }
                return this.currentSelectChessOrSpellIndex = -1,
                this.WaitSelectCards = null,
                !1
            }
            return !1
        }
        ReqSelectOtherChess(e, t) {
            let i = this.currentSelectOtherChessUserID;
            i ? this.proxy.SendProto(ProtoBufId.CMSG_CREQSELECTOTHERCHESS, {
                tableID: this.TableID,
                userID: i,
                goodsID: e,
                isPreselection: t
            }) : this.currentSelectChessOrSpellIndex >= 0 ? this.ReqChessSkillSelectSpellOrChess(this.currentSelectChessOrSpellIndex, t, TavernChessBuffSelectType.CBSETChess, e, 0) : this.ReqChessSelectSpellChess(e, t)
        }
        onRespSelectOtherChess(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i,
            s = t.ProtoData.isPreselection,
            a = t.ProtoData.playerList,
            n = this.HandChess;
            this.updatePlayer(a),
            this.HandChess.some(e => {
                let t = !1;
                n.some(i => {
                    if (e == i)
                        return t = !0, !0
                }),
                t || (i = e)
            }),
            s ? TavernChessGameContext.IsViewer && this.event(TavernChessGameManager.RESP_CHOOSE_CARD, [i, !0]) : (this.event(TavernChessGameManager.RESP_CHOOSE_CARD, i), this.dealSelectWindow(s, i.goodsID || i.spellID))
        }
        ReqChessSelectSpellChess(e, t) {
            TavernChessGameGuideManager.GetInstance().IsGuide ? TavernChessGameGuideManager.GetInstance().SelectSpellChess(e, t) : this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSSELECTSPELLCHESS, {
                tableID: this.TableID,
                goodsID: e,
                isPreselection: t
            })
        }
        onRespChessSelectSpellChess(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.chess,
            s = t.ProtoData.isPreselection;
            s ? TavernChessGameContext.IsViewer && this.event(TavernChessGameManager.RESP_CHOOSE_CARD, [i, !0]) : (this.SelfInfo.AddHandChess(i), this.event(TavernChessGameManager.RESP_CHOOSE_CARD, i), this.dealSelectWindow(s, i ? i.goodsID || i.spellID : 0))
        }
        ReqChessSkillSelectSpellOrChess(e, t, i, s, a) {
            TavernChessGameContext.IsViewer || (TavernChessGameGuideManager.GetInstance().IsGuide ? TavernChessGameGuideManager.GetInstance().SelectSkillSelectSpellOrChess(t, a, this.TableID, i) : this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSSKILLSELECTSPELLORCHESS, {
                    tableID: this.TableID,
                    index: e,
                    isPreselection: t,
                    selectTyp: i,
                    goodsID: s,
                    spellID: a
                }))
        }
        onRespChessSkillSelectSpellOrChess(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i,
            s,
            a = t.ProtoData.selectTyp,
            n = t.ProtoData.isPreselection;
            if (a == TavernChessBuffSelectType.CBSETChess ? (i = t.ProtoData.chess, s = t.ProtoData.goodsID) : a == TavernChessBuffSelectType.CBSETSpell && (i = t.ProtoData.spell, s = t.ProtoData.spellID), n)
                TavernChessGameContext.IsViewer && this.event(TavernChessGameManager.RESP_CHOOSE_CARD, [i, !0, s]);
            else {
                if (!i) {
                    let e = WindowManager.GetInstance().GetInstanceWindow("TavernChessSelectCardWindow");
                    return e && e.Close(),
                    this.WaitSelectCards = null,
                    void this.PlaySelectOtherChess()
                }
                this.SelfInfo.AddHandChess(i),
                this.event(TavernChessGameManager.RESP_CHOOSE_CARD, i),
                this.dealSelectWindow(n, s)
            }
        }
        dealSelectWindow(e, t) {
            TavernChessGameContext.IsViewer && !e && (WindowManager.GetInstance().hasWindow("TavernChessSelectGeneralWindow") || this.WaitSelectCards && this.WaitSelectCards.some(e => {
                    if (e.ServerInfo && e.ServerInfo.goodsID == t || e.CardVO && e.CardVO.CardID == t)
                        return this.WaitSelectCards = null, !0
                }))
        }
        ReqChessGameEndTime(e) {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSGAMEENDTIME, {
                tableID: this.TableID,
                second: e
            })
        }
        onRespChessGameEndTime(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            t.errCode && UIUtils.ShowProtocolResult(t.errCode)
        }
        ReqChessGm(e, t, i = 0, s = 0, a = []) {
            9 != e && 10 != e && (this.gmCnt = 0),
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSGM, {
                tableID: this.TableID,
                emGM: e,
                id: t,
                num: i,
                pos: s,
                params: a
            })
        }
        onRespChessGm(e) {
            let t = e.Protocol;
            this.gmCnt--,
            t.errCode ? UIUtils.ShowProtocolResult(t.errCode) : this.gmCnt <= 0 && (this.gmCnt = 0, this.bGM = !0, this.ReqChessEnterTeam(), this.event(TavernChessGameManager.RESP_GM))
        }
        onNotifyChessTeamMatchData(e) {
            if (!this.checkMsg(e))
                return;
            if (!Laya.Browser.window.isDebug)
                return;
            let t = e.Protocol.ProtoData.teamMatchData;
            this.teamMatchDataDic || (this.teamMatchDataDic = new Dictionary),
            this.teamMatchDataDic.destroy(),
            t && t.forEach(e => {
                this.teamMatchDataDic.add(e.uniqueUserID, e)
            }),
            this.event(TavernChessGameManager.TEAM_MATCH_UPDATE)
        }
        GetTeamMatchData(e) {
            return this.teamMatchDataDic ? this.teamMatchDataDic.get(this.TableID + "_" + e) : null
        }
        onEndRecruit(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol,
            i = t.ProtoData.chessPlayer,
            s = t.ProtoData.otherPlayer;
            if (this.updatePlayer(i), s && s.length)
                for (let e = 0; e < s.length; e++) {
                    let t = s[e];
                    this.updatePlayer(t)
                }
            this.selfInfo.ClearBattleTimeInfo(),
            this.clearEndRecruit(),
            this.WaitSelectEquiments = null,
            this.battleEndProtoData = null,
            this.bGameGameOver = !1,
            this.cachedUserBuff && this.cachedUserBuff.clear(),
            this.cachedUserIds && this.cachedUserIds.clear(),
            this.cachedBattleEndTime && this.cachedBattleEndTime.clear(),
            this.battleEndMap && this.battleEndMap.clear(),
            Laya.stage.isVisibility ? TavernChessGameContext.JumpToGameOver() : (this.ClearCachedChessData(), TavernChessGameContext.ClearCardQueue(), TavernChessGameContext.ClearQueue()),
            TavernChessGameContext.ClearCardQueue(),
            TavernChessGameContext.ClearSkinChangeCondition(!1),
            this.Phase = TavernChessPhaseType.EndRecruit,
            TavernChessGameGuideManager.GetInstance().IsAiGuide && GuideManager.GetInstance().EndGuide();
            let a = WindowManager.GetInstance();
            a.hasWindow("TavernChessLiSaoWindow") && a.CloseWindow("TavernChessLiSaoWindow")
        }
        clearEndRecruit() {
            this.lockFlag = !1,
            this.RefreshShopFree = !1,
            this.WaitSelectCards = null,
            this.waitSelectCardArr = [],
            this.currentSelectChessOrSpellIndex = -1,
            this.currentSelectOtherChessUserID = "",
            this.waitSelectChessDic && this.waitSelectChessDic.destroy(),
            this.waitSelectChessChessDic && this.waitSelectChessChessDic.destroy(),
            this.waitSelectChessSpellDic && this.waitSelectChessSpellDic.destroy(),
            this.waitSelectedChessIndexArr = [],
            this.waitSelectedGeneralIndexArr = [],
            this.waitSelectedSpellIndexArr = [],
            this.tunShiChessIDs = null,
            this.tunShiSrcChessIDs = null,
            this.godMurderChessMap = null
        }
        ReqDiQingSelectSkill(e, t) {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQDIQINGSELECTSKILL, {
                tableID: this.TableID,
                generalSkillID: e,
                isPreselection: t
            })
        }
        onRespDiQingSelectSkill(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.isPreselection,
            s = t.ProtoData.GeneralSkillID,
            a = TavernChessConfiger.GetInstance().GetGeneralByGeneralID(this.selfInfo.generalID);
            a && (this.selfInfo.generalSkillList = [s, a.GeneralSkill]),
            this.event(TavernChessGameManager.RESP_CHOOSE_SKILL, [s, i]),
            i || WindowManager.GetInstance().hasWindow("TavernChessSelectSkillWindow") || (this.selfInfo.chessPlayerSkillInfo && (this.selfInfo.chessPlayerSkillInfo.diQingSelectSkillTurn = this.CurRound), this.SendEvent(TavernChessGameManager.ANI_SKILL_TO_SKILL_UI), this.SendEvent(TavernChessGameManager.UI_UPDATE_DING_QING_TURN))
        }
        get ShopGoods() {
            return this.shopGoods
        }
        updateShopGoods(e, t, i = !0) {
            this.shopGoods = e,
            t && this.event(TavernChessGameManager.ANI_SHOP_REFRESH, i)
        }
        getShopGoodsByGoodsID(e) {
            if (!this.shopGoods)
                return null;
            for (let t = 0; t < this.shopGoods.length; t++)
                if (this.shopGoods[t] && this.shopGoods[t].goodsID == e)
                    return this.shopGoods[t];
            return null
        }
        get ShopRefreshCost() {
            let e = TimerManager.GetInstance().ServerTime;
            return this.FreeRefreshEndTime && e < this.FreeRefreshEndTime ? 0 : Math.max(0, this.selfInfo ? this.selfInfo.shopRefreshCost : TavernChessConfiger.GetInstance().GlobalData.ShopRefreshCost)
        }
        GetShopBuyCost(e) {
            let t = this.selfInfo ? this.selfInfo.shopBuyCost : TavernChessConfiger.GetInstance().GlobalData.ChessPrice,
            i = this.selfInfo && this.selfInfo.chessPlayerSkillInfo ? this.selfInfo.chessPlayerSkillInfo.shopBuyAddCoin : 0,
            s = t + i,
            a = this.getShopGoodsByGoodsID(e);
            if (e && this.CheckHasS3CiXioingShuangGuJian()) {
                let e = this.selfInfo.lastBuyChessGender;
                if (e && a) {
                    let t = a.chessID,
                    i = TavernChessConfiger.GetInstance().GetCardByCardID(t);
                    i && i.Gender != e && (s = 2)
                }
            }
            let n = this.selfInfo && this.selfInfo.chessPlayerSkillInfo ? this.selfInfo.chessPlayerSkillInfo.s9LiuCheLastBuyChess : 0;
            if (n) {
                let e = TavernChessConfiger.GetInstance().GetCardByCardID(n),
                t = TavernChessConfiger.GetInstance().GetGeneralSKillByType(TavernChessGeneralSkillEffectType.CHESSGSETS9LiuChe),
                s = t && t.SkillData && t.SkillData.GetConditions ? t && t.SkillData && t.SkillData.GetConditions : 0;
                if (s) {
                    let t = e ? e.GetMinionTyp(null) : 0,
                    n = e ? e.ChessRank : 0,
                    r = TavernChessConfiger.GetInstance().GetCardByCardID(a.chessID),
                    l = r ? r.GetMinionTyp(a) : 0,
                    h = r ? r.ChessRank : 0;
                    s == TavernChessGetConditionsType.CHESSGCTSameMinion ? t && t == l && (i = -1) : s == TavernChessGetConditionsType.CHESSGCTSameRank ? n && n == h && (i = -1) : s == TavernChessGetConditionsType.CHESSGCTSameMinionAndSameRank ? t && n && t == l && n == h && (i = -1) : s == TavernChessGetConditionsType.CHESSGCTSameMinionOrSameRank && (t || n) && (t != l && n != h || (i = -1))
                }
            }
            return s + i
        }
        get ShopChessSoldPrice() {
            let e = 0;
            for (let t = 0; t < this.selfInfo.equipments.length; t++) {
                let i = this.selfInfo.equipments[t];
                if (!i)
                    continue;
                let s = TavernChessConfiger.GetInstance().GetEquipByEquipID(i.equipmentID);
                if (!s)
                    continue;
                let a = TavernChessConfiger.GetInstance().GetEquipSkillBySkillID(s.WeaponSkill);
                a && (a.WeaponSkillNameType && a.WeaponSkillNameType == TavernChessWeaponSkillNameType.CWSNTYuXi && a.Opportunity == TavernChessTriggerType.CHESSTTMaiWuJIangPaiShi && a.SkillData && a.SkillData.ActiveRound && i.skillProgress && (e += a.SkillData ? a.SkillData.AddCoin : 0))
            }
            return TavernChessConfiger.GetInstance().GlobalData.ChessSoldPrice + e
        }
        get ShopMaxLevel() {
            if (!this.confShopMaxLevel) {
                let e = TavernChessConfiger.GetInstance().ShopVOList;
                if (e && e.length) {
                    let t = e.length;
                    for (let i = 0; i < t; i++) {
                        let t = e[i];
                        t && this.confShopMaxLevel < t.ShopRank && (this.confShopMaxLevel = t.ShopRank)
                    }
                }
            }
            return this.confShopMaxLevel
        }
        get ShopCurLevel() {
            return this.selfInfo ? this.selfInfo.shopLevel : 0
        }
        set ShopCurLevel(e) {
            this.selfInfo && this.selfInfo.shopLevel != e && (this.selfInfo.shopLevel = e, this.event(TavernChessGameManager.UI_UPDATE_SHOP_LEVEL))
        }
        get ShopLevelUpCost() {
            let e = this.ExtraSkillUpgradeCost;
            return Math.max(0, (this.selfInfo ? this.selfInfo.shopLevelUpCost : 6) - e)
        }
        set ShopLevelUpCost(e) {
            this.selfInfo && this.selfInfo.shopLevelUpCost != e && (this.selfInfo.shopLevelUpCost = e, this.event(TavernChessGameManager.UI_UPDATE_SHOP_LEVELUP_COST))
        }
        get ShopNextRoundAdd() {
            let e = TavernChessConfiger.GetInstance().GlobalData;
            if (!e)
                return 2;
            let t = e.MaxProfit ? e.MaxProfit : Number.MAX_VALUE;
            if (TavernChessGameGuideManager.GetInstance().IsGuide) {
                let e = TavernChessGameGuideManager.GetInstance().Stage;
                if (1 == e)
                    return 10;
                if (2 == e)
                    return 2 == this.CurRound ? 4 : 3 == this.CurRound ? 5 : 3;
                t = Math.min(5, t)
            }
            return TavernChessGameGuideManager.GetInstance().IsLastStage ? 20 : Math.min(t, e.BaseIncrement + e.ProfitIncrement * this.CurRound)
        }
        get ShopLock() {
            return !!this.selfInfo && this.selfInfo.shopLock
        }
        get CoinNum() {
            return this.selfInfo ? this.selfInfo.coin : 0
        }
        get RealCoinNum() {
            return this.selfInfo ? this.selfInfo.coin : 0
        }
        set CoinNum(e) {
            this.DispersionCoinNum = 0,
            this.selfInfo && this.selfInfo.coin != e && (this.selfInfo.coin = e, this.event(TavernChessGameManager.UI_UPDATE_COIN_NUM))
        }
        get FreeRefreshEndTime() {
            return this.selfInfo && this.selfInfo.chessPlayerSkillInfo ? this.selfInfo.chessPlayerSkillInfo.freeRefreshEndTime : 0
        }
        set FreeRefreshEndTime(e) {
            this.selfInfo && this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.freeRefreshEndTime != e && (this.selfInfo.chessPlayerSkillInfo.freeRefreshEndTime = e, this.event(TavernChessGameManager.UI_UPDATE_FREE_REFRESH_END_TIME))
        }
        get DispersionCoinNum() {
            return this.dispersionCoinNum
        }
        set DispersionCoinNum(e) {
            this.dispersionCoinNum != e && (this.dispersionCoinNum = e, this.event(TavernChessGameManager.UI_UPDATE_DISPERSION_COIN))
        }
        get IsReady() {
            return this.isReady
        }
        set IsReady(e) {
            this.isReady = e
        }
        get ShopOpen() {
            return this.shopOpen
        }
        set ShopOpen(e) {
            this.shopOpen != e && (this.shopOpen = e)
        }
        get SanLianGoodsIDs() {
            return this.sanlianGoodsIDs
        }
        ReqTeamUserReady(e) {
            this.CanOperate && (TavernChessGameGuideManager.GetInstance().IsGuide && TavernChessGameGuideManager.GetInstance().Ready(this.TableID), this.proxy.SendProto(ProtoBufId.CMSG_CREQTEAMUSERREADY, {
                    tableID: this.TableID,
                    ready: e
                }))
        }
        get LeadTimeReady() {
            return this.leadTimeReady
        }
        onRespTeamUserReady(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.ready;
            this.leadTimeReady = t.ProtoData.leadTimeReady,
            this.isReady != i && (this.isReady = i, this.event(TavernChessGameManager.UI_UPDATE_READY))
        }
        ReqShopRefreshChess(e = !1) {
            if (!e && !this.CanOperate)
                return;
            if (TavernChessGameContext.IsViewer)
                return;
            if (TavernChessGameContext.CheckSuWuCantOpt())
                return;
            this.reconnectAutoRefreshShop = !1;
            let t = !1;
            !TavernChessGameGuideManager.GetInstance().IsGuide || e ? (GuideManager.GetInstance().CurrentGuideID == GuideStepEnum.NEW_TAVERN_CHESS_STEP_3_2 && (t = !0), this.proxy.SendProto(ProtoBufId.CMSG_CREQSHOPREFRESHCHESS, {
                    tableID: this.TableID,
                    isAuto: e,
                    isThirdRookieCustomFist: t
                })) : TavernChessGameGuideManager.GetInstance().ShopRefresh()
        }
        onRespShopRefreshChess(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            t.errCode ? UIUtils.ShowProtocolResult(t.errCode) : (this.CoinNum = t.ProtoData.restCoin, this.FreeRefreshEndTime = t.ProtoData.freeRefreshEndTime, this.RefreshShopFree = !1, this.updateShopGoods(t.ProtoData.shopGoods, !0), 0 != this.selfInfo.shopLock && (this.selfInfo.shopLock = !1, this.event(TavernChessGameManager.UI_UPDATE_SHOP_LOCK)), this.checkSanLianAni())
        }
        get HandCardLimit() {
            let e = this.selfInfo ? this.selfInfo.changeHandNum : 0;
            return TavernChessConfiger.GetInstance().GlobalData.MaxHandCard + e
        }
        get HandCardFull() {
            return this.HandCardCnt >= this.HandCardLimit
        }
        ReqShopBuyChess(e) {
            if (!this.CanOperate)
                return;
            if (!e)
                return void this.event(TavernChessGameManager.ANI_SHOP_BUY, 0);
            if (this.HandChess.length >= this.HandCardLimit)
                return UIUtils.ShowErrorTextPrompt(words.TAVERN_CHESS_SHOP_3), void this.event(TavernChessGameManager.ANI_SHOP_BUY, 0);
            if (this.Phase != TavernChessPhaseType.InRecruit)
                return UIUtils.ShowErrorTextPrompt(words.TAVERN_CHESS_SHOP_4), void this.event(TavernChessGameManager.ANI_SHOP_BUY, 0);
            let t = this.GetShopBuyCost(e);
            if (this.CoinNum < t)
                return TavernChessConfiger.GetInstance().PlaySound(TavernChessSoundType.CSTMoneyNoEnough), UIUtils.ShowTextPrompt(words.TAVERN_CHESS_SHOP_2), void this.event(TavernChessGameManager.ANI_SHOP_BUY, 0);
            TavernChessGameGuideManager.GetInstance().IsGuide ? TavernChessGameGuideManager.GetInstance().ShopBuy(e) : (this.buyPrice = t, this.buyIng = !0, this.proxy.SendProto(ProtoBufId.CMSG_CREQSHOPBUYCHESS, {
                    tableID: this.TableID,
                    goodsID: e
                }))
        }
        onRespShopBuyChess(e) {
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            if (!this.checkMsg(e))
                return;
            this.buyIng = !1;
            let t = e.Protocol;
            if (t.errCode)
                return UIUtils.ShowProtocolResult(t.errCode), void this.event(TavernChessGameManager.ANI_SHOP_BUY, 0);
            this.CoinNum = t.ProtoData.restCoin;
            let i = t.ProtoData.goodsID,
            s = t.ProtoData.buyChess,
            a = this.deleteShopGoods(i);
            if (this.selfInfo.AddHandChess(s), s && this.CheckHasS3CiXioingShuangGuJian()) {
                let e = TavernChessConfiger.GetInstance().GetCardByCardID(s.chessID);
                this.selfInfo.lastBuyChessGender = e ? e.Gender : 0
            }
            this.event(TavernChessGameManager.ANI_SHOP_BUY, [i, a]),
            this.checkSanLianAni()
        }
        ReqShopRecycleChess(e) {
            if (TavernChessGameGuideManager.GetInstance().IsGuide)
                this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, 0);
            else if (TavernChessGameGuideManager.GetInstance().IsLastStage)
                this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, 0);
            else if (this.CanOperate) {
                if (this.Phase != TavernChessPhaseType.InBattle)
                    return TavernChessGameContext.CheckSuWuCantOpt() ? (UIUtils.ShowErrorTextPrompt(words.TAVERN_CHESS_OPERATE_ERROR_6), void this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, 0)) : void this.proxy.SendProto(ProtoBufId.CMSG_CREQSHOPRECYCLECHESS, {
                        tableID: this.TableID,
                        goodsID: e
                    });
                UIUtils.ShowErrorTextPrompt(words.TAVERN_CHESS_SHOP_6)
            } else
                this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, 0)
        }
        ReqChessDeleteSpell(e) {
            if (TavernChessGameGuideManager.GetInstance().IsGuide)
                this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, 0);
            else if (TavernChessGameGuideManager.GetInstance().IsLastStage)
                this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, 0);
            else if (this.CanOperate) {
                if (this.Phase != TavernChessPhaseType.InBattle)
                    return TavernChessGameContext.CheckSuWuCantOpt() ? (UIUtils.ShowErrorTextPrompt(words.TAVERN_CHESS_OPERATE_ERROR_6), void this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, 0)) : void this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSDELETESPELL, {
                        tableID: this.TableID,
                        spellGoodsID: e
                    });
                UIUtils.ShowErrorTextPrompt(words.TAVERN_CHESS_SHOP_6)
            } else
                this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, 0)
        }
        onRespShopRecycleChess(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            if (t.errCode)
                return UIUtils.ShowProtocolResult(t.errCode), void this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, 0);
            this.CoinNum = t.ProtoData.restCoin;
            let i = t.ProtoData.goodsID;
            this.deleteHandGoods(i),
            this.deleteChessGoods(i),
            this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, [i]),
            this.event(TavernChessGameManager.UI_UPDATE_LINEUP_TIP),
            this.checkSanLianAni(),
            TavernChessGameGuideManager.GetInstance().IsAiGuide && (TavernChessGameGuideManager.GetInstance().IsSell = !0),
            TavernChessLineupManager.GetInstance().CalculateScore()
        }
        onRespChessDeleteSpell(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            if (t.errCode)
                return UIUtils.ShowProtocolResult(t.errCode), void this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, 0);
            let i = t.ProtoData.spellGoodsID;
            this.deleteHandGoods(i),
            this.deleteChessGoods(i),
            this.event(TavernChessGameManager.ANI_CHESS_RECYCLE, [i]),
            this.event(TavernChessGameManager.UI_UPDATE_LINEUP_TIP)
        }
        ReqShopLock() {
            if (TavernChessGameContext.IsViewer)
                return void UIUtils.ShowTextPrompt(words.TAVERN_CHESS_LOOKON_TIP2);
            if (!this.CanLockShop)
                return;
            let e = !this.selfInfo.shopLock;
            this.proxy.SendProto(ProtoBufId.CMSG_CREQSHOPLOCK, {
                tableID: this.TableID,
                isLock: e
            })
        }
        onRespShopLock(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.isLock;
            i != this.selfInfo.shopLock && (this.selfInfo.shopLock = i, this.event(TavernChessGameManager.UI_UPDATE_SHOP_LOCK)),
            TavernChessGameGuideManager.GetInstance().IsAiGuide && (TavernChessGameGuideManager.GetInstance().IsLock = !0),
            this.phase == TavernChessPhaseType.EndRecruit && (this.lockFlag = !0)
        }
        ReqShopLevelUp() {
            this.CanOperate && (TavernChessGameGuideManager.GetInstance().IsGuide ? TavernChessGameGuideManager.GetInstance().ReqShopLevelUp(this.TableID) : TavernChessGameContext.CheckSuWuCantOpt() || this.proxy.SendProto(ProtoBufId.CMSG_CREQSHOPLEVELUP, {
                    tableID: this.TableID
                }))
        }
        onRespShopLevelUp(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            this.CoinNum = t.ProtoData.restCoin;
            let i = t.ProtoData.level,
            s = t.ProtoData.shopUpLevelCost;
            this.ShopLevelUpCost = s,
            this.ShopCurLevel = i,
            TavernChessGameGuideManager.GetInstance().IsAiGuide && (TavernChessGameGuideManager.GetInstance().IsLevel = !0),
            TavernChessLineupManager.GetInstance().CalculateScore()
        }
        ReqChessLineUp(e, t = !1, i = !0) {
            if (i && !this.CanOperate && !t)
                return this.event(TavernChessGameManager.ANI_LINE_UP, null), void TavernChessLineupManager.GetInstance().CalculateScore();
            if (this.Phase == TavernChessPhaseType.InBattle)
                return this.event(TavernChessGameManager.ANI_LINE_UP, null), void UIUtils.ShowErrorTextPrompt(words.TAVERN_CHESS_SHOP_6);
            if (TavernChessGameContext.CheckSuWuCantOpt())
                return void this.event(TavernChessGameManager.ANI_LINE_UP, null);
            let s = this.BattleChess ? this.BattleChess.map(e => e ? e.goodsID : 0) : null;
            for (; s.length < TavernChessGameContext.ChessMaxCnt; )
                s.push(0);
            if (JSON.stringify(e) == JSON.stringify(s) && !t)
                return void this.event(TavernChessGameManager.ANI_LINE_UP, null);
            let a = !1;
            if (e && s && s.forEach(t => {
                    if (t && -1 == e.indexOf(t))
                        return a = !0, !0
                }), a)
                return void this.event(TavernChessGameManager.ANI_LINE_UP, null);
            if (TavernChessGameGuideManager.GetInstance().IsGuide)
                return void TavernChessGameGuideManager.GetInstance().LineUp(e);
            let n = this.findExtraElements(s, e),
            r = !n || 0 == n.length;
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSLINEUP, {
                tableID: this.TableID,
                positionChess: e,
                changeSeat: r
            })
        }
        findExtraElements(e, t) {
            return e ? t ? t.filter(t => -1 == e.indexOf(t) && 0 != t) : null : t
        }
        onRespChessLineUp(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            if (t.errCode)
                return UIUtils.ShowProtocolResult(t.errCode), void this.event(TavernChessGameManager.ANI_LINE_UP, null);
            if (TavernChessGameContext.LineFlag)
                this.event(TavernChessGameManager.ANI_LINE_UP_SKILL);
            else {
                let e = t.ProtoData.positionChess,
                i = this.selfInfo.LineUpGoodsIDs,
                s = this.findExtraElements(i, e);
                this.selfInfo.UpdateLineUpChess(e),
                this.event(TavernChessGameManager.ANI_LINE_UP, [e, s]),
                this.checkSanLianAni()
            }
            TavernChessGameContext.LineFlag = !1,
            TavernChessLineupManager.GetInstance().CalculateScore()
        }
        ReqChessSendEmote(e) {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSSENDEMOTE, {
                tableID: this.TableID,
                emoteID: e
            })
        }
        onRespChessSendEmote(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            t.errCode && UIUtils.ShowProtocolResult(t.errCode)
        }
        onNotifyChessSendEmote(e) {
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.srcUserID,
            s = t.ProtoData.emoteID;
            this.event(TavernChessGameManager.UI_UPDATE_SEND_EMOJI_LIST, {
                uid: i,
                type: 1,
                emojiID: s
            })
        }
        ReqChessComposite(e) {
            if (this.Phase == TavernChessPhaseType.InRecruit && !TavernChessGameContext.IsViewer && !this.BShowSelfEquipWindow && e && e.length) {
                let t = [];
                for (let i = 0; i < e.length; i++) {
                    let s = e[i];
                    s && t.push(s.goodsID)
                }
                if (TavernChessGameGuideManager.GetInstance().IsGuide)
                    return void TavernChessGameGuideManager.GetInstance().ChessComposite(t);
                this.testGoods = t,
                this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSCOMPOSITE, {
                    tableID: this.TableID,
                    chessGoodsId: t
                })
            }
        }
        onRespChessComposite(e) {
            if (!this.checkMsg(e))
                return;
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol;
            if (t.errCode)
                return UIUtils.ShowProtocolResult(t.errCode), void LogManager.GetInstance().SendErrorLog("ChessCompositeFail" + t.errCode + this.testGoods);
            this.testGoods = null;
            let i = t.ProtoData.chessGoodsId,
            s = t.ProtoData.compositeChess,
            a = t.ProtoData.spell;
            if (i)
                for (let e = 0; e < i.length; e++) {
                    let t = i[e];
                    this.deleteHandGoods(t),
                    this.deleteChessGoods(t)
                }
            this.selfInfo.AddHandChess(s),
            this.selfInfo.AddHandChess(a),
            this.event(TavernChessGameManager.ANI_CHESS_COMPOSITE, [i, s, a]),
            this.event(TavernChessGameManager.UI_UPDATE_LINEUP_TIP),
            this.checkSanLianAni(),
            this.ReqChessLineUp(this.selfInfo.LineUpGoodsIDs)
        }
        CheckNextSanLianReq() {
            this.checkSanLianReq()
        }
        CheckSanLianAni() {
            this.checkSanLianAni()
        }
        set BPlayedEndAni(e) {
            this.bPlayedEndAni = e
        }
        get BattleStart() {
            return this.battleStart
        }
        onNotifyChessBattleStart(e) {
            if (!this.checkMsg(e))
                return;
            this.startFlag = !0,
            this.isGetAllMsgOver = !1,
            this.addCachedData(e),
            this.bPlayedEndAni = !1;
            let t,
            i = this.cachedChessData ? this.cachedChessData.length : 0,
            s = [],
            a = 0;
            for (let e = 0; e < i; e++) {
                let n = this.cachedChessData[e];
                if (n.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSBATTLESTART)
                    break;
                let r = n.Protocol,
                l = r.ProtoData.skillID,
                h = r.ProtoData.useSkillTyp,
                o = r.ProtoData.fromGoodsID;
                if (h == TavernChessClientSkillEnum.CHESS) {
                    if (n.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYUSESKILL)
                        a == l && this.arraysContainSameNumbers(t, o) ? (this.cachedChessData.splice(e, 1), e--, i--) : (a = l, t = o, s = []);
                    else if (n.Protocol.ProtoVO.protoID == ProtoBufId.CMSG_CNOTIFYCHESSDATAUPDATE) {
                        let h = r.ProtoData.chessDataUpdateTyp,
                        d = !1;
                        a == l && this.arraysContainSameNumbers(t, o) && (s.some((t, a) => {
                                if (t.msg.ProtoData.chessDataUpdateTyp == h) {
                                    let n = this.cachedChessData.indexOf(t);
                                    return -1 != n && (this.cachedChessData.splice(n, 1), i--, e--),
                                    d = !0,
                                    s.splice(a, 1),
                                    !0
                                }
                            }), s.push(n))
                    }
                } else
                    a = 0, t = null, s = []
            }
            let n = TavernChessGameContext.CalculateAllEndRecriutAniTime(this.cachedChessData, this.selfInfo),
            r = TavernChessConfiger.GetInstance().GlobalData,
            l = r && r.RecruitEndTimeLimit ? r.RecruitEndTimeLimit : 30;
            if (l *= 1e3, n > l) {
                let e = r && r.RecruitEndSpeedCelling ? r.RecruitEndSpeedCelling : Number.MAX_VALUE;
                TavernChessGameContext.Speed = Math.min(e, n / l)
            }
            TavernChessGameContext.EndRecruitEffctTime = l + 1e3,
            TavernChessGameContext.EndRecruitNeedTime = Math.min(n, l + 1e3),
            n > 0 && TavernChessGameContext.StartEndRecruitEffect(),
            this.PlayChessDataUpdate()
        }
        arraysContainSameNumbers(e, t) {
            if (!e || !t)
                return !1;
            const i = new Set(e);
            for (let e of t)
                if (!i.has(e))
                    return !1;
            const s = new Set(t);
            for (let t of e)
                if (!s.has(t))
                    return !1;
            return !0
        }
        dealNotifyCHessBattleStart(e) {
            this.battleStartTime = TimerManager.GetInstance().ServerTime,
            this.event(TavernChessGameManager.END_RECRUIT_JUMP_COMPLETE),
            this.clearEndRecruit(),
            this.testTime = Date.now();
            let t = e.Protocol.ProtoData;
            this.battleStart = !0,
            this.battlePlayerInfo = t.battlePlayer,
            TavernChessGameContext.StartTime = TimerManager.GetInstance().ServerTime,
            TavernChessGameContext.StopEndRecruitEffect(),
            TavernChessGameContext.IsLeave || (Laya.stage.isVisibility ? TavernChessGameContext.IsViewer ? this.isGetAllMsgOver && this.calcuallMsgTime() : this.Phase = TavernChessPhaseType.StartBattle : TavernChessGameContext.LastTime = TimerManager.GetInstance().ServerTime)
        }
        onNotifyChessBattleEnd(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol.ProtoData,
            i = !1;
            if (t && t.owner && t.owner.userID == TavernChessGameContext.SelfUserID && (i = !0), this.battleEndMap || (this.battleEndMap = new Map), t.owner && this.battleEndMap.set(t.owner.userID, t), !i)
                return;
            this.isAllGameOver = !!t.gameOver;
            let s = this.battleEndProtoData;
            if (this.battleEndProtoData = t, this.bGameGameOver && this.dealBattleEndProtoData(), this.CheckDeadInRecruit())
                if (TavernChessGameContext.IsViewer && !this.NeedQuiteLookOn)
                    TavernChessGameContext.IsInbattle || this.ReqChessLookOn(0);
                else {
                    let e = !1;
                    if (TavernChessGameContext.IsTeamTavern) {
                        t.isDoubleEscapeDead && (e = !0, this.phase != TavernChessPhaseType.StartBattle && this.phase != TavernChessPhaseType.InBattle && this.phase != TavernChessPhaseType.EndBattle ? this.ShowDoubleEsapeTip() : s && (this.battleEndProtoData.owner = s.owner, this.battleEndProtoData.lostHp = s.lostHp, this.battleEndProtoData.rawLostHp = s.rawLostHp, this.battleEndProtoData.isAllotmentDamage = s.isAllotmentDamage, this.battleEndProtoData.battleResult = s.battleResult, this.battleEndProtoData.battlePlayer = s.battlePlayer, this.battleEndProtoData.damageHp = s.damageHp))
                    }
                    e || (TavernChessGameContext.StopBattle(), WindowManager.GetInstance().CloseAllWindow(), this.event(TavernChessGameManager.RESP_LEAVE_GAME))
                }
            this.startFlag = !1
        }
        GetLastHpByUID(e) {
            return this.lastHPMap && this.lastHPMap.get(e) || 0
        }
        ShowDoubleEsapeTip() {
            UIUtils.ShowTextPrompt(words.TAVERN_CHESS_FRIEND_LEAVE_TIP, TextPromptEnum.NORMAL, 2e3),
            Laya.timer.once(2e3, this, () => {
                TavernChessGameContext.StopBattle(),
                WindowManager.GetInstance().CloseAllWindow(),
                this.event(TavernChessGameManager.RESP_LEAVE_GAME)
            })
        }
        GetLoseBattlePlayer(e) {
            if (!this.battleEndMap)
                return null;
            let t = this.battleEndMap.get(TavernChessGameContext.SelfUserID);
            if (!t)
                return null;
            let i = e ? t.battlePlayer : t.owner;
            return i || null
        }
        GetOwnerBattlePlayer() {
            if (!this.battleEndMap)
                return null;
            let e = this.battleEndMap.get(TavernChessGameContext.SelfUserID);
            return e ? e.owner : null
        }
        CheckDeadInRecruit() {
            return this.isAllGameOver && !this.startFlag && (!this.injuredArr || this.injuredArr.length <= 0) && !TavernChessGameContext.IsLeave
        }
        onNotifyChessGameResult(e) {
            this.checkMsg(e) && (this.battleResultProtoData = e.Protocol.ProtoData)
        }
        get BattleResultProtoData() {
            return this.battleResultProtoData
        }
        get BattleEndProtoData() {
            return this.battleEndProtoData
        }
        get BattleEndTime() {
            return this.battleEndTime
        }
        get BattleStartTime() {
            return this.battleStartTime
        }
        dealBattleEndProtoData() {
            if (TavernChessGameGuideManager.GetInstance().IsGuide && (TavernChessGameGuideManager.GetInstance().BStartVideo = !1), this.battleEndProtoData) {
                if (this.Phase = TavernChessPhaseType.EndBattle, this.battleEndProtoData.battleResult == TavernChessBattleGameResultType.CBGRTDraw) {
                    let e = Math.abs(this.battleEndProtoData.lostHp);
                    if (TavernChessGameContext.IsTeamTavern && e) {
                        let e = SceneManager.GetInstance().CurrentScene;
                        if (e) {
                            let t = Math.abs(this.battleEndProtoData.lostHp);
                            e.PlayShareDamage(t)
                        }
                    } else
                        TavernChessGameContext.IsTeamTavern && this.BattleEndProtoData.isDoubleEscapeDead ? this.ShowDoubleEsapeTip() : (this.battleStart = !1, this.bPlayedEndAni = !0, TavernChessGameReplayManager.GetInstance().IsReplay ? TavernChessGameReplayManager.GetInstance().PlayNextTurn() : TavernChessGameContext.IsViewer ? this.autoSwitchLookOn() : this.PlayFirstKillAni() || this.PlayEnterNotify())
                } else
                    this.event(TavernChessGameManager.ANI_ROUND_END);
                this.bGameGameOver = !1
            }
        }
        onNotifyChessGameOver(e) {}
        ReqChessSendProp(e, t) {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSSENDPROP, {
                tableID: this.TableID,
                destUserID: t,
                propID: e
            })
        }
        onRespChessSendProp(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            t.errCode && UIUtils.ShowProtocolResult(t.errCode)
        }
        onNotifyChessSendProp(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol,
            i = t.ProtoData.destUserID,
            s = t.ProtoData.srcUserID,
            a = t.ProtoData.propID,
            n = TimerManager.GetInstance().ServerTime;
            this.sendGiftRecord || (this.sendGiftRecord = {}),
            s == TavernChessGameContext.SelfUserID && (this.sendGiftRecord.toUID == i && this.sendGiftRecord.propID == a ? (this.sendGiftRecord.cnt++, this.sendGiftRecord.time = n) : (this.sendGiftRecord.toUID = i, this.sendGiftRecord.propID = a, this.sendGiftRecord.cnt = 1, this.sendGiftRecord.time = n, this.event(TavernChessGameManager.NOTIFY_CHESS_SEND_PROP_COMBO, null)), this.event(TavernChessGameManager.NOTIFY_CHESS_SEND_PROP_COMBO, this.sendGiftRecord), Laya.timer.clear(this, this.clearGiftCombo), Laya.timer.once(3e3, this, this.clearGiftCombo)),
            this.event(TavernChessGameManager.NOTIFY_CHESS_SEND_PROP, [i, s, a])
        }
        clearGiftCombo() {
            this.sendGiftRecord = null,
            this.event(TavernChessGameManager.NOTIFY_CHESS_SEND_PROP_COMBO, this.sendGiftRecord)
        }
        ReqChessQueryBuff(e, t, i, s) {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSQUERYBUFF, {
                tableID: this.TableID,
                chessID: e,
                userID: t,
                isLast: i,
                turn: s
            })
        }
        onRespChessQueryBuff(e) {
            if (TavernChessGameContext.CheckNeedBlockMsg())
                return;
            let t = e.Protocol.ProtoData.chess;
            this.event(TavernChessGameManager.RESP_CHESS_QUERY_BUFF, [t])
        }
        onNotifyChessGeneralInjured(e) {
            if (!this.checkMsg(e))
                return;
            TavernChessGameContext.IsInbattle;
            this.dealGeneralInjured(e)
        }
        dealGeneralInjured(e) {
            let t = e.Protocol,
            i = t.ProtoData.srcGoodsID,
            s = t.ProtoData.damageHp;
            this.injuredArr || (this.injuredArr = []),
            this.injuredArr.push({
                damageHP: s,
                srcGoodsID: i
            })
        }
        EndInjured(e) {
            (!this.injuredArr || this.injuredArr.length <= 0) && e <= 0 && (!this.isAllGameOver || this.startFlag || TavernChessGameContext.IsLeave || (TavernChessGameContext.IsLeave = !0, TavernChessGameContext.StopBattle(), WindowManager.GetInstance().CloseAllWindow(), TavernChessGameContext.IsViewer && !this.NeedQuiteLookOn ? TavernChessGameContext.IsInbattle || this.ReqChessLookOn(0) : this.event(TavernChessGameManager.RESP_LEAVE_GAME)))
        }
        onNotifyCreateGameMsg(e) {
            let t = e.Protocol.ProtoData.User;
            if (this.battleStart = !1, TavernChessGameGuideManager.GetInstance().IsGuide && TavernChessGameGuideManager.GetInstance().BStartVideo && (t && t.some(e => {
                        if (e.GeneralID == TavernChessGameGuideManager.GetInstance().SelectedGenealID)
                            return TavernChessGameGuideManager.GetInstance()
                                .VideoUserID = e.UserID, !0
                        }), TavernChessGameGuideManager.GetInstance().VideoUserID || (TavernChessGameGuideManager.GetInstance().VideoUserID = t && t[0] ? t[0].UserID : 0)), t && t.forEach(e => {
                        e.UserID == TavernChessGameContext.SelfUserID ? this.selfUserInfo = e : (this.enemyPlayerInfo = e, this.battlePlayerInfo || this.playerList && this.playerList.some(t => {
                                    t.userID == e.UserID && (this.battlePlayerInfo = t)
                                }))
                    }), TavernChessGameReplayManager.GetInstance().IsReplay || TavernChessGameGuideManager.GetInstance().BStartVideo) {
                    if (!this.selfUserInfo) {
                        let e = t.indexOf(this.enemyPlayerInfo);
                        this.selfUserInfo = t[1 - e]
                    }
                    this.selfInfo = TavernChessGameContext.UserInfoToPlayerInfo(this.selfUserInfo),
                    this.battlePlayerInfo = TavernChessGameContext.UserInfoToPlayerInfo(this.enemyPlayerInfo),
                    this.event(TavernChessGameManager.UPDATE_REPLAY_INFO),
                    this.event(TavernChessGameManager.UI_UPDATE_BATTLE_SPELL_INIT)
                }
            if (TavernChessGameContext.IsViewer) {
                let e = t.indexOf(this.enemyPlayerInfo);
                this.selfUserInfo = t[1 - e];
                let i = this.GetChessPlayerByUID(this.selfUserInfo.UserID);
                this.selfInfo.shopLevel = i ? i.shopLevel : null,
                this.selfInfo && this.selfInfo.userID == TavernChessGameContext.SelfUserID || (this.battlePlayerInfo = TavernChessGameContext.UserInfoToPlayerInfo(this.enemyPlayerInfo), this.selfInfo = TavernChessGameContext.UserInfoToPlayerInfo(this.selfUserInfo)),
                this.event(TavernChessGameManager.UPDATE_REPLAY_INFO),
                this.event(TavernChessGameManager.UI_UPDATE_BATTLE_SPELL_INIT),
                this.event(TavernChessGameManager.UI_UPDATE_BATTLE_PLAYER)
            }
            this.selfUserInfo && this.selfUserInfo.Chess && this.selfUserInfo.Chess.forEach((e, t) => {
                e.pos = t,
                e.isBattleChess = !0
            }),
            this.enemyPlayerInfo && this.enemyPlayerInfo.Chess && this.enemyPlayerInfo.Chess.forEach((e, t) => {
                e.pos = t,
                e.isBattleChess = !0
            }),
            TavernChessGameContext.IsResume || (this.Phase = TavernChessPhaseType.InBattle),
            this.injuredArr = [],
            TavernChessGameContext.IsJumpGameOver || this.event(TavernChessGameManager.GAME_START),
            TavernChessGameContext.UpdateAnimateCnt(TavernChessSpeedType.BATTLE)
        }
        onNotifyChessUseSpellMsg(e) {
            let t = e.Protocol.ProtoData,
            i = t.ChessID,
            s = t.UniqueID,
            a = t.SpellID,
            n = t.TargetListUnique,
            r = t.IndexID,
            l = t.OldAttackTarget;
            this.event(TavernChessGameManager.CHESS_USE_SPELL, [i, s, a, n, r, l])
        }
        onNotifyDamageMsg(e) {
            let t = e.Protocol.ProtoData;
            this.event(TavernChessGameManager.CHESS_DAMAGE_MSG, t)
        }
        onNotifyChessDoubleUserDamage(e) {
            if (!this.checkMsg(e))
                return;
            e.Protocol;
            TavernChessGameContext.IsInbattle ? this.addCachedData(e) : this.dealChessDoubleUserDamage(e)
        }
        dealChessDoubleUserDamage(e, t = !1) {
            let i = e.Protocol.ProtoData.chessBaseInfo;
            this.dealBasePlayerInfo(i, 0, !0) && (this.CanPlay = !0, this.PlayChessDataUpdate())
        }
        onNotifyUpdateChessHpAttackMsg(e) {
            let t = e.Protocol.ProtoData,
            i = t.UniqueID,
            s = t.InitAttack,
            a = t.CurAttack,
            n = t.InitHp,
            r = t.CurHp,
            l = t.TotalHp;
            this.updateChessInfo(i, [{
                        key: "hp",
                        value: n
                    }, {
                        key: "curHp",
                        value: r
                    }, {
                        key: "totalHp",
                        value: l
                    }, {
                        key: "attack",
                        value: s
                    }, {
                        key: "totalAttack",
                        value: a
                    }
                ])
        }
        onNotifyUpdateChessBuffMsg(e) {
            let t = e.Protocol.ProtoData,
            i = t.UniqueID,
            s = t.mapBuffTyp;
            this.updateChessInfo(i, [{
                        key: "mapBuffTyp",
                        value: s
                    }
                ]),
            TavernChessGameContext.CanNextProtocol = !0
        }
        onNotifyUpdateChessInfoMsg(e) {
            let t,
            i = e.Protocol.ProtoData,
            s = i.UserID,
            a = i.Chess,
            n = [],
            r = [],
            l = this.selfUserInfo && this.selfUserInfo.UserID == s;
            t = l ? this.selfUserInfo ? this.selfUserInfo.Chess : null : this.enemyPlayerInfo ? this.enemyPlayerInfo.Chess : null,
            a.forEach((e, t) => {
                e.pos = t,
                e.isBattleChess = !0
            }),
            a && a.forEach(e => {
                let i = !1;
                t && t.some(t => {
                    if (e.UniqueId == t.UniqueId)
                        return i = !0, !0
                }),
                i || (TavernChessGameContext.UPdateChessBuffFlag(e), n.push(e))
            }),
            t && t.forEach(e => {
                let t = !1;
                a && a.some(i => {
                    if (e.UniqueId == i.UniqueId)
                        return t = !0, !0
                }),
                t || r.push(e)
            }),
            l ? this.selfUserInfo.Chess = a : this.enemyPlayerInfo && (this.enemyPlayerInfo.Chess = a),
            r.length > 0 && !TavernChessGameContext.IsJumpGameOver && this.event(TavernChessGameManager.DELETE_CHESS, [r, l]),
            n.length > 0 && !TavernChessGameContext.IsJumpGameOver && this.event(TavernChessGameManager.ADD_CHESS, [n, l]),
            t && t.sort((e, t) => e.pos - t.pos)
        }
        onNotifyGodChessKill(e) {
            let t = e.Protocol.ProtoData,
            i = (t.UserIndexID, t.GodUniqueID),
            s = t.KillUniqueID,
            a = t.GodChessID;
            TavernChessGameContext.CanNextProtocol = !0,
            this.godMurderChessMap || (this.godMurderChessMap = {});
            let n = a;
            n || this.BattleChess && this.BattleChess.some(e => {
                if (e.UniqueId == i)
                    return n = e.chessID, !0
            }),
            n || this.EnemyChess && this.EnemyChess.some(e => {
                if (e.UniqueId == i)
                    return n = e.chessID, !0
            }),
            this.godMurderChessMap[s] = n
        }
        GetMurderUniqueID(e) {
            return this.godMurderChessMap ? this.godMurderChessMap[e] : 0
        }
        ClearMuderUniqueID(e) {
            this.godMurderChessMap && delete this.godMurderChessMap[e]
        }
        onNotifyChessGetBaseInfoMsg(e) {
            let t = e.Protocol.ProtoData;
            if (t.UserID == this.selfInfo.userID) {
                let e = t.getTyp,
                i = t.hardChessCard,
                s = t.hardSpellCard,
                a = [],
                n = !0,
                r = !1;
                switch (e) {
                case TavernChessEffectType.CHESSETHuoDeJinBi:
                    t.getInfo && (this.CoinNum = this.RealCoinNum + t.getInfo),
                    TavernChessGameContext.CanNextProtocol = !0;
                    break;
                case TavernChessEffectType.CHESSETHuoDeJingYan:
                    TavernChessGameContext.CanNextProtocol = !0;
                    break;
                case TavernChessEffectType.CHESSETHuoDeWuJiangPaiShi:
                case TavernChessEffectType.CHESSETHuoDeJinNangPaiShi:
                case TavernChessEffectType.CHESSETSelect:
                case TavernChessEffectType.CHESSETBackHand:
                    if (this.HandChess.length >= this.HandCardLimit)
                        return void(TavernChessGameContext.CanNextProtocol = !0);
                    i && i.forEach(e => {
                        e.goodsID = TavernChessGameManager.VIRTUAL_GOODS_ID + e.battleGoodsID,
                        this.HandChess.length < this.HandCardLimit && (a.push(e), this.selfInfo.AddHandChess(e), this.selfInfo.AddBattleTimeInfo(e))
                    }),
                    s && s.forEach(e => {
                        e.goodsID = TavernChessGameManager.VIRTUAL_JINGNANG_GOODS_ID + e.battleGoodsID,
                        this.HandChess.length < this.HandCardLimit && (a.push(e), this.selfInfo.AddHandChess(e), this.selfInfo.AddBattleTimeInfo(e))
                    }),
                    a && a.length ? this.event(TavernChessGameManager.BATTLE_ADD_HAND, [a]) : TavernChessGameContext.CanNextProtocol = !0;
                    break;
                case TavernChessEffectType.CHESSETGongJiBianHua:
                case TavernChessEffectType.CHESSETTiLiBianHua:
                    if (this.handCardUpdateArr || (this.handCardUpdateArr = []), i && i.forEach(e => {
                            e.goodsID || (e.goodsID = TavernChessGameManager.VIRTUAL_GOODS_ID + e.battleGoodsID),
                            e.goodsID && -1 == this.handCardUpdateArr.indexOf(e.goodsID) && this.handCardUpdateArr.push(e.goodsID),
                            this.selfInfo.UpdateHandChess(e)
                        }), TavernChessGameContext.NextProto && TavernChessGameContext.NextProto.ProtoVO.protoID == ProtoBufId.CMSG_CNTFCHESSGETBASEINFOMSG) {
                        (TavernChessGameContext.NextProto.ProtoVO.protoData.getTyp == TavernChessEffectType.CHESSETGongJiBianHua || TavernChessEffectType.CHESSETTiLiBianHua) && (n = !1)
                    }
                    n && (this.event(TavernChessGameManager.BATTLE_UPDATE_HAND, [this.handCardUpdateArr]), this.handCardUpdateArr = null),
                    TavernChessGameContext.CanNextProtocol = !0;
                    break;
                case TavernChessEffectType.CHESSETZhuGongZhiLiao:
                    this.UpdateHP(this.HP + t.getInfo, !0),
                    TavernChessGameContext.CanNextProtocol = !0;
                    break;
                case TavernChessEffectType.CHESSETZhuGongShangHai:
                    this.UpdateHP(this.HP - t.getInfo),
                    TavernChessGameContext.CanNextProtocol = !0;
                    break;
                case TavernChessEffectType.CHESSETYiChuMuBiao:
                    i && i.forEach((e, t) => {
                        this.HandChess.some(i => {
                            if (i.goodsID == e.goodsID || i.battleGoodsID == e.battleGoodsID)
                                return this.HandChess.splice(t, 1), r = !0, !0
                        })
                    }),
                    s && s.forEach(e => {
                        this.HandChess.some((t, i) => {
                            if (t.goodsID == e.goodsID || t.battleGoodsID == e.battleGoodsID)
                                return this.HandChess.splice(i, 1), r = !0, !0
                        })
                    }),
                    r && this.event(TavernChessGameManager.BATTLE_DELETE_HAND),
                    TavernChessGameContext.Manager.SendEvent(TavernChessGameManager.UI_UPDATE_HAND_CARD_NUM),
                    TavernChessGameContext.CanNextProtocol = !0;
                    break;
                default:
                    TavernChessGameContext.CanNextProtocol = !0
                }
            } else
                TavernChessGameContext.CanNextProtocol = !0
        }
        onNotifyChessCancelSpellMsg(e) {
            let t = e.Protocol.ProtoData,
            i = t.ChessID,
            s = t.UniqueID,
            a = t.SpellID;
            this.event(TavernChessGameManager.CANCEL_USE_SPELL, [i, s, a])
        }
        onNotifyChessAllMsg(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol.ProtoData,
            i = t.MsgBuff,
            s = t.IsBegin,
            a = t.IsOver,
            n = t.userID;
            ClientConfiger.GetInstance().IsDebug && (s && (this.fileMsgBuffArr = []), i && this.fileMsgBuffArr.push(i)),
            this.cachedUserBuff || (this.cachedUserBuff = new Map),
            this.cachedUserIds || (this.cachedUserIds = new Map),
            TavernChessGameContext.IsViewer ? (n.forEach(e => {
                    let i = this.cachedUserBuff.get(e);
                    i || (i = []),
                    i.push(t),
                    this.cachedUserBuff.set(e, i),
                    this.cachedUserIds.set(e, n)
                }), a && this.cachedUserBuff.size >= this.AlivePlayerCnt && (this.isGetAllMsgOver = !0, this.battleStart && this.calcuallMsgTime())) : this.dealChessBattleMsg(s, i, a)
        }
        SaveReord() {
            let e = 0;
            this.fileMsgBuffArr.forEach(t => e += t.length);
            let t = new Uint8Array(e),
            i = 0;
            this.fileMsgBuffArr.forEach(e => {
                t.set(e, i),
                i += e.length
            });
            let s = new Laya.Browser.window.Blob([t], {
                type: "application/octet-stream"
            });
            Laya.Browser.window.saveAs && (Laya.Browser.window.saveAs(s, "自走棋录像" + DateUtils.DateFormat(new Date, "yyyyMMddhhmmss") + ".sgs"), UIUtils.ShowTextPrompt(words.SAVE_RECORD_SUCCESS))
        }
        calcuallMsgTime() {
            let e = this.cachedUserIds.get(TavernChessGameContext.SelfUserID),
            t = this.cachedUserBuff.get(TavernChessGameContext.SelfUserID);
            t && t.forEach(t => {
                this.dealChessBattleMsg(t.IsBegin, t.MsgBuff, t.IsOver, e)
            }),
            this.Phase = TavernChessPhaseType.StartBattle
        }
        dealChessBattleMsg(e, t, i, s = null) {
            if (e && (this.cachedBuff = [], TavernChessGameContext.ClearQueue()), this.cachedBuff.push(t), i) {
                this.startAnalyzeBuff(),
                this.lastBuff = null;
                let e = TavernChessGameContext.CalculateAllProtoTime() + Math.ceil(TavernChessGameContext.EndRecruitNeedTime / 1e3);
                this.battleEndTime = this.battleStartTime + e,
                this.cachedBattleEndTime || (this.cachedBattleEndTime = new Map),
                s && s.forEach(e => {
                    this.cachedBattleEndTime.set(e, this.battleEndTime)
                }),
                TavernChessGameContext.IsViewer || this.ReqChessGameEndTime(e)
            }
        }
        startAnalyzeBuff() {
            if (this.currentBuff)
                return;
            if (!this.cachedBuff || this.cachedBuff.length <= 0)
                return;
            let e,
            t = this.cachedBuff.shift();
            if (this.currentBuff = t, this.lastBuff) {
                let i = new Uint8Array(this.lastBuff.length + t.length);
                i.set(this.lastBuff),
                i.set(t, this.lastBuff.length),
                e = new ByteArray(i)
            } else
                e = new ByteArray(t);
            let i = this.lastBuff ? this.lastBuff.length : 0,
            s = 0;
            for (; e.bytesAvailable; ) {
                this.lastBuff = null;
                let a = !1;
                if (s = 0, e.pos + 4 <= e.length) {
                    let t = e.readUnsignedInt();
                    if (s += 4, e.pos + 2 <= e.length) {
                        s += 2;
                        let i = e.readUnsignedShort();
                        if (e.pos + i <= e.length) {
                            let s = new Uint8Array(e.buffer, e.pos, i);
                            WBMgr.GetInstance().ResumeReceiveData(t, s, GameReplayManager.TAG_RECEIVE),
                            e.pos += i,
                            a = !0
                        }
                    }
                }
                if (!a) {
                    this.lastBuff = t.subarray(e.pos - s - i);
                    break
                }
            }
            this.currentBuff = null,
            this.startAnalyzeBuff()
        }
        onNtfChessGameOverMsg(e) {
            TavernChessGameContext.StopBattle(),
            TavernChessGameContext.UpdateAnimateCnt(TavernChessSpeedType.NONE),
            this.dataClear(),
            TavernChessGameContext.IsJumpGameOver && this.event(TavernChessGameManager.JUMP_GAME_OVER),
            this.bGameGameOver = !0;
            let t = TavernChessGameContext.IsViewer && (!this.battleEndProtoData || this.battleEndProtoData.owner.userID != TavernChessGameContext.SelfUserID);
            if (t) {
                let e = this.battleEndMap ? this.battleEndMap.get(TavernChessGameContext.SelfUserID) : null;
                e && (this.battleEndProtoData = e, t = !1)
            }
            if (TavernChessGameReplayManager.GetInstance().IsReplay || t || TavernChessGameGuideManager.GetInstance().IsGuide) {
                let t = e.Protocol.ProtoData,
                i = -1,
                s = !1;
                this.battleEndProtoData = null,
                t.GameOverInfo && t.GameOverInfo.some(e => {
                    if (e.UserID == TavernChessGameContext.SelfUserID && (this.battleEndProtoData = {
                                battleResult: e.emRus + 1,
                                owner: this.selfInfo,
                                battlePlayer: this.battlePlayerInfo,
                                lostHp: 0,
                                damageHp: 0,
                                rank: 1,
                                gameOver: !1
                            }), 2 == e.emRus && (i = e.iLostHp), 3 == e.emRus && (i = 0), this.battleEndProtoData && i >= 0)
                        return !0
                }),
                this.battleEndProtoData && (this.battleEndProtoData.lostHp = i, this.battleEndProtoData.damageHp = i, this.battleEndProtoData.battleResult == TavernChessBattleGameResultType.CBGRTLost && (s = this.battleEndProtoData.owner.hp - this.battleEndProtoData.lostHp <= 0), this.battleEndProtoData.gameOver = s)
            }
            this.dealBattleEndProtoData()
        }
        onNotifyChessFutureBuff(e) {
            let t,
            i,
            s,
            a = e.Protocol.ProtoData.mapPlayerBuffTyp,
            n = TavernChessConfiger.GetInstance();
            this.selfFutureChess || (this.selfFutureChess = new Dictionary),
            this.selfFutureChess.destroy(),
            this.enemyFutureChess || (this.enemyFutureChess = new Dictionary),
            this.enemyFutureChess.destroy();
            for (let e in a) {
                let r = this.SelfUserIndexID == Number(e),
                l = a[e] ? a[e].futureBuff : null;
                l && l.forEach(e => {
                    let a = 0,
                    l = 0;
                    i = n.GetCardByCardID(e.chessID);
                    for (let t in e.mapBuffTyp) {
                        let i = e.mapBuffTyp[t];
                        s = n.GetBuffByBuffID(i.buffID),
                        s && (s.EffectTyp == TavernChessEffectType.CHESSETTiLiBianHua ? a += i.buffValue : s.EffectTyp == TavernChessEffectType.CHESSETGongJiBianHua && (l += i.buffValue))
                    }
                    let h = i.DefaultDEF + a,
                    o = i.DefaultATK + l;
                    t = {
                        goodsID: 0,
                        chessID: e.chessID,
                        hp: i.DefaultDEF,
                        attack: i.DefaultATK,
                        curHp: h,
                        totalHp: h,
                        totalAttack: o,
                        zhaoHuanFlag: !0
                    },
                    r ? this.selfFutureChess.add(t.chessID, t) : this.enemyFutureChess.add(t.chessID, t)
                })
            }
            TavernChessGameContext.CanNextProtocol = !0
        }
        onNotifyChessJudgeResult(e) {
            let t = e.Protocol.ProtoData,
            i = t.UserIndexID,
            s = t.UniqueID,
            a = t.SpellID,
            n = t.Result;
            this.event(TavernChessGameManager.JUDGE_SKILL, [i, s, a, n])
        }
        onNotifyChessRankMsg(e) {
            if (TavernChessGameContext.CanNextProtocol = !0, !TavernChessGameReplayManager.GetInstance().IsReplay)
                return;
            let t = e.Protocol.ProtoData.teamRankUser;
            this.serverRankDataList = [],
            ObjUtil.deepCopy(t, this.serverRankDataList);
            let i = t ? t.length : 0;
            for (let e = 0; e < i; e++) {
                let i = t[e];
                if (i && i.userID) {
                    i.initRank = e,
                    i.hpLimit = TavernChessGameContext.GetReplayHpLimit(i.userID),
                    this.updateHeadInfo(i.userID, i);
                    let t = this.GetChessPlayerByUID(i.userID);
                    t ? t.hp = i.hp : this.updatePlayer({
                        userID: i.userID,
                        hp: i.hp
                    });
                    let s = this.getLastRoundPlayerByUID(i.userID);
                    s ? s.hp = i.hp : this.updateLastRoundPlayer({
                        userID: i.userID,
                        hp: i.hp
                    }),
                    i.doubleUserID && (this.friendMap || (this.friendMap = new Map), this.friendMap.set(i.userID, i.doubleUserID), this.friendMap.set(i.doubleUserID, i.userID))
                }
            }
            this.sortHealList();
            let s = this.selfInfo.hpLimit,
            a = this.battlePlayerInfo.hpLimit;
            this.selfInfo.hpLimit = TavernChessGameContext.GetReplayHpLimit(this.selfInfo.userID),
            this.battlePlayerInfo.hpLimit = TavernChessGameContext.GetReplayHpLimit(this.battlePlayerInfo.userID),
            this.event(TavernChessGameManager.ANI_SELECT_GENERAL_FLY),
            this.event(TavernChessGameManager.UPDATE_HEAD_INFO),
            s != this.selfInfo.hpLimit && this.event(TavernChessGameManager.UI_UPDATE_GENERAL),
            a != this.battlePlayerInfo.hpLimit && this.event(TavernChessGameManager.UI_UPDATE_GENERAL_ENEMY)
        }
        onNotifyChessPassiveBuffMsg(e) {
            let t = e.Protocol.ProtoData,
            i = t.UniqueID,
            s = t.PassiveBuff;
            this.event(TavernChessGameManager.CHESS_PASSIVE_BUFF_MSG, [i, s])
        }
        onNotifyChessGameEventMsg(e) {
            let t,
            i = e.Protocol.ProtoData,
            s = i.PlayerIndex,
            a = i.UniqueID,
            n = i.ChessID,
            r = i.EventType,
            l = this.SelfUserIndexID == s;
            l ? this.BattleChess && this.BattleChess.some(e => {
                if (e.UniqueId == a)
                    return t = e, !0
            }) : this.EnemyChess && this.EnemyChess.some(e => {
                if (e.UniqueId == a)
                    return t = e, !0
            }),
            r && n && this.event(TavernChessGameManager.BROADCAST_EVENT, [l, t, n, r]),
            TavernChessGameContext.CanNextProtocol = !0
        }
        onNotifyChessShopMsg(e) {
            let t = e.Protocol.ProtoData,
            i = t.UserID,
            s = (t.UserIndexID, t.ShopChessCard);
            i == this.SelfUserID && (s && s.forEach((e, t) => {
                    this.shopGoods && this.shopGoods.some(i => {
                        if (i && e && i.goodsID == e.chessID)
                            return this.shopGoods[t] = e, !0
                    })
                }), this.updateShopGoods(s, !1, !1)),
            TavernChessGameContext.CanNextProtocol = !0
        }
        onNotifyChessUpdateSkillMsg(e) {
            let t = e.Protocol.ProtoData,
            i = t.UniqueID,
            s = t.skills,
            a = !1;
            this.BattleChess && this.BattleChess.some(e => {
                if (e.UniqueId == i)
                    return e.skills = s, a = !0, !0
            }),
            a || this.EnemyChess && this.EnemyChess.some(e => {
                if (e.UniqueId == i)
                    return e.skills = s, a = !0, !0
            }),
            this.event(TavernChessGameManager.UPDATE_SKILL, [i]),
            TavernChessGameContext.CanNextProtocol = !0
        }
        onNotifyChessUpdateOtherInfoMsg(e) {
            let t = e.Protocol.ProtoData,
            i = t.UniqueID,
            s = t.IsHaveFirstTriggerMaShu,
            a = !1;
            this.BattleChess && this.BattleChess.some(e => {
                if (e.UniqueId == i)
                    return e.isHaveFirstTriggerMaShu = s, a = !0, !0
            }),
            a || this.EnemyChess && this.EnemyChess.some(e => {
                if (e.UniqueId == i)
                    return e.isHaveFirstTriggerMaShu = s, a = !0, !0
            }),
            this.event(TavernChessGameManager.UPDATE_OTHER_INFO_MSG, [i])
        }
        onNotifyChessEquipMsg(e) {
            let t = e.Protocol.ProtoData,
            i = t.UserID,
            s = t.lordEquip;
            i == TavernChessGameContext.SelfUserID && (this.selfInfo.UpdateEquipData(s), this.event(TavernChessGameManager.UI_UPDATE_EQUIP_SKILL_PROGRESS)),
            TavernChessGameContext.CanNextProtocol = !0
        }
        onNotifyLordSkillMsg(e) {
            let t = e.Protocol.ProtoData,
            i = t.UserIndexID,
            s = t.lordSkillData,
            a = null,
            n = 0;
            this.SelfUserIndexID == i ? (n = this.selfInfo ? this.selfInfo.generalID : 0, a = this.selfLordSkillData, this.selfLordSkillData = s, this.selfInfo && this.selfInfo.chessPlayerSkillInfo && (this.selfInfo.chessPlayerSkillInfo.lordSkillData = s)) : (n = this.battlePlayerInfo ? this.battlePlayerInfo.generalID : 0, a = this.enmyLordSkillData, this.enmyLordSkillData = s, this.battlePlayerInfo && this.battlePlayerInfo.chessPlayerSkillInfo && (this.battlePlayerInfo.chessPlayerSkillInfo.lordSkillData = s));
            let r = TavernChessConfiger.GetInstance().GetGeneralByGeneralID(n),
            l = r ? r.GeneralSkill : 0,
            h = TavernChessConfiger.GetInstance().GetGeneralSkillBySkillID(l);
            if (h && h.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETHouYi) {
                let e = a && a.houYiKillCount || 0,
                t = s && s.houYiKillCount || 0;
                e < t && h.SkillData && t == h.SkillData.Count && this.event(TavernChessGameManager.GENERAL_SKILL_UPGRADE, l)
            }
            TavernChessGameContext.CanNextProtocol = !0
        }
        get SelfLordSkillData() {
            return this.selfLordSkillData
        }
        get EnmyLordSkillData() {
            return this.enmyLordSkillData
        }
        onNotifyChessTunShiNotify(e) {
            let t = e.Protocol.ProtoData,
            i = (t.UserIndexID, t.TargetUniqueID),
            s = t.UniqueID;
            this.tunShiChessIDs || (this.tunShiChessIDs = []),
            this.tunShiSrcChessIDs || (this.tunShiSrcChessIDs = []),
            this.tunShiChessIDs.push(i),
            this.tunShiSrcChessIDs.push(s),
            this.event(TavernChessGameManager.ZHONGKUI_GENERAL_SKILL_TIGGER),
            TavernChessGameContext.CanNextProtocol = !0
        }
        onNotifyChessMissAttackMsg(e) {
            let t = e.Protocol.ProtoData,
            i = t.AttackUniqueID,
            s = t.TargetUniqueID;
            this.event(TavernChessGameManager.MISS_ATTACK, [i, s])
        }
        get TunShiSrcChessIDs() {
            return this.tunShiSrcChessIDs
        }
        get TunShiChessIDs() {
            return this.tunShiChessIDs
        }
        updateChessInfo(e, t) {
            let i = !1,
            s = {
                goodsID: e,
                hpValue: null,
                attValue: null,
                buffParams: null
            };
            this.selfUserInfo && this.selfUserInfo.Chess && this.selfUserInfo.Chess.some(a => {
                if (a.UniqueId == e)
                    return t.forEach(e => {
                        let t = a[e.key];
                        a[e.key] = e.value,
                        t != e.value && ("curHp" == e.key ? (s.hpValue = e.value, s.hpDiffValue = e.value - t) : "totalAttack" == e.key && (s.attValue = e.value, s.attDiffValue = e.value - t)),
                        "mapBuffTyp" == e.key && (s.buffParams = TavernChessGameContext.CompareMapBuffInfo(t, e.value))
                    }), i = !0, !0
            }),
            i || this.enemyPlayerInfo && this.enemyPlayerInfo.Chess && this.enemyPlayerInfo.Chess.some(a => {
                if (a.UniqueId == e)
                    return t.forEach(e => {
                        let t = a[e.key];
                        a[e.key] = e.value,
                        t != e.value && ("curHp" == e.key ? (s.hpValue = e.value, s.hpDiffValue = e.value - t) : "totalAttack" == e.key && (s.attValue = e.value, s.attDiffValue = e.value - t)),
                        "mapBuffTyp" == e.key && (s.buffParams = TavernChessGameContext.CompareMapBuffInfo(t, e.value))
                    }), i = !0, !0
            }),
            TavernChessGameContext.IsJumpGameOver || this.event(TavernChessGameManager.CHESS_INFO_UPDATE, s)
        }
        get SelfGeneralID() {
            return this.selfGeneralID
        }
        get SelfPreGeneralID() {
            return this.selfPreGeneralID
        }
        dataClear() {
            this.selfGeneralID = 0,
            this.selfPreGeneralID = 0
        }
        checkSanLianAni() {
            if (this.Phase != TavernChessPhaseType.InRecruit)
                return this.sanlianGoodsIDs = [], void this.event(TavernChessGameManager.ANI_SANLIAN_TIP);
            if (this.cachedChessData && this.cachedChessData.length > 0)
                return;
            this.sanlianGoodsIDs = [];
            let e = {},
            t = this.ShopGoods,
            i = this.BattleChess,
            s = this.HandChess,
            a = this.WaitSelectCards,
            n = this.SanLianUniversalChessIDs,
            r = this.SanLianUniversalGoodsIds;
            if (t && t.length)
                for (let i = 0; i < t.length; i++) {
                    let s = t[i];
                    s && (e[s.chessID] || (e[s.chessID] = []), e[s.chessID].push(s), n && -1 != n.indexOf(s.chessID) && -1 == r.indexOf(s.goodsID) && r.push(s.goodsID))
                }
            if (i && i.length)
                for (let t = 0; t < i.length; t++) {
                    let s = i[t];
                    s && (e[s.chessID] || (e[s.chessID] = []), e[s.chessID].push(s), n && -1 != n.indexOf(s.chessID) && -1 == r.indexOf(s.goodsID) && r.push(s.goodsID))
                }
            if (s && s.length)
                for (let t = 0; t < s.length; t++) {
                    let i = s[t];
                    i && (e[i.chessID] || (e[i.chessID] = []), e[i.chessID].push(i), n && -1 != n.indexOf(i.chessID) && -1 == r.indexOf(i.goodsID) && r.push(i.goodsID))
                }
            if (a && a.length) {
                let t = [];
                for (let i = 0; i < a.length; i++) {
                    let s = {};
                    ObjUtil.copyObj(e, s);
                    let l = r.slice(0),
                    h = a[i] ? a[i].ServerInfo : null;
                    h && (s[h.chessID] || (s[h.chessID] = []), s[h.chessID].length >= 2 && s[h.chessID].push(h), n && -1 != n.indexOf(h.chessID) && -1 == l.indexOf(h.goodsID) && (l.push(h.goodsID), t.push(h.chessID))),
                    this.setSanLianGoodsIDs(l, s)
                }
            } else
                this.setSanLianGoodsIDs(r, e);
            this.event(TavernChessGameManager.ANI_SANLIAN_TIP)
        }
        get SanLianUniversalChessIDs() {
            return TavernChessConfiger.GetInstance().GetSanLianUniversalChessIDsBySeasonID(TavernChessManager.GetInstance().CurSeasonID)
        }
        get SanLianUniversalGoodsIds() {
            let e = [];
            return this.HandChess && this.HandChess.forEach(t => {
                if (t) {
                    let i = TavernChessConfiger.GetInstance().GetCardByCardID(t.chessID);
                    t && t.isWildCard && -1 == e.indexOf(t.goodsID) && i.CanSanLian && e.push(t.goodsID)
                }
            }),
            this.BattleChess && this.BattleChess.forEach(t => {
                if (t) {
                    let i = TavernChessConfiger.GetInstance().GetCardByCardID(t.chessID);
                    t && t.isWildCard && t.goodsID && -1 == e.indexOf(t.goodsID) && i.CanSanLian && e.push(t.goodsID)
                }
            }),
            e
        }
        setSanLianGoodsIDs(e, t) {
            let i = this.SanLianUniversalChessIDs,
            s = this.SanLianUniversalGoodsIds,
            a = 3 - e.length,
            n = 2 - e.length;
            a <= 0 && (a = 1),
            n <= 0 && (n = 1);
            let r = [],
            l = !1,
            h = a;
            for (const e in t)
                if (Object.prototype.hasOwnProperty.call(t, e)) {
                    let o = t[e],
                    d = o[0] ? o[0].chessID : 0,
                    c = o[0] ? o[0].goodsID : 0,
                    S = o ? o.length : 0,
                    u = TavernChessConfiger.GetInstance().GetCardByCardID(d),
                    I = this.getSanLianCnt(u);
                    h = 3 == I ? a : n,
                    u && u.GodChessType && (h = 3);
                    let g = i && -1 != i.indexOf(d);
                    if (g || (g = s && -1 != s.indexOf(c)), g) {
                        if (S >= I)
                            for (let e = 0; e < o.length; e++) {
                                let t = o[e],
                                i = TavernChessConfiger.GetInstance().GetCardByCardID(t.chessID);
                                i && i.CanSanLian && r.push(t.goodsID)
                            }
                    } else if (S >= h)
                        for (let e = 0; e < o.length; e++) {
                            let t = o[e],
                            i = TavernChessConfiger.GetInstance().GetCardByCardID(t.chessID);
                            i && i.CanSanLian && (r.push(t.goodsID), h < I && !l && (l = !0))
                        }
                }
            if (l)
                for (let t = 0; t < e.length; t++) {
                    let i = e[t];
                    -1 == r.indexOf(i) && r.push(i)
                }
            if (r && r.length)
                for (let e = 0; e < r.length; e++) {
                    let t = r[e];
                    -1 == this.sanlianGoodsIDs.indexOf(t) && this.sanlianGoodsIDs.push(t)
                }
        }
        checkSanLianReq() {
            if (this.Phase != TavernChessPhaseType.InRecruit)
                return;
            if (this.cachedChessData && this.cachedChessData.length > 0)
                return;
            if (this.BShowSelfEquipWindow)
                return;
            let e = TavernChessConfiger.GetInstance(),
            t = this.BattleChess;
            if (t && t.length)
                for (let i = 0; i < t.length; i++) {
                    let s = t[i];
                    if (!s)
                        continue;
                    let a = e.GetCardByCardID(s.chessID);
                    if (a && a.CanSanLian) {
                        let e = this.getServerChess(a, s),
                        t = this.getSanLianCnt(a);
                        if (e && e.length >= t)
                            return void this.ReqChessComposite(e.slice(0, t))
                    }
                }
            let i = this.HandChess;
            if (i && i.length)
                for (let t = 0; t < i.length; t++) {
                    let s = i[t];
                    if (!s)
                        continue;
                    let a = e.GetCardByCardID(s.chessID);
                    if (a && a.CanSanLian) {
                        let e = this.getSanLianCnt(a),
                        t = this.getServerChess(a, s);
                        if (t && t.length >= e)
                            return void this.ReqChessComposite(t.slice(0, e))
                    }
                }
        }
        getSanLianCnt(e) {
            if (!e || e.Gender != TavernChessGenderType.CHESSMTWonmen)
                return 3;
            if (e.GodChessType)
                return 3;
            let t = !1,
            i = this.SelfInfo ? this.SelfInfo.generalSkillList : null;
            return i && i.some(e => {
                let i = TavernChessConfiger.GetInstance().GetGeneralSkillBySkillID(e);
                if (i && i.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETWuZeTian) {
                    let e = TavernChessZhuGongSkillManager.GetInstance().GetInstanceClass(i, this.selfInfo);
                    t = e.Activated
                }
                if (t)
                    return !0
            }),
            t ? 2 : 3
        }
        checkBingLiangAct() {
            if (this.CurRound == this.CantBuyShopTurn) {
                let e = TavernChessConfiger.GetInstance().BingLiangSkillIDs;
                if (e && e.length)
                    for (let t = 0; t < e.length; t++) {
                        let i = e[t];
                        this.event(TavernChessGameManager.UI_UPDATE_BATTLE_SPELL_ACT, i)
                    }
            }
        }
        getServerChess(e, t) {
            let i = [],
            s = this.SanLianUniversalChessIDs,
            a = this.BattleChess;
            if (a && a.length)
                for (let n = 0; n < a.length; n++) {
                    let r = a[n];
                    if (!r)
                        continue;
                    let l = e.GetMinionTyp(t);
                    r.chessID == e.CardID ? i.push(r) : s && -1 == s.indexOf(r.chessID) ? r.isWildCard && l != TavernChessMinionType.CHESSMTGod && i.push(r) : i.push(r)
                }
            let n = this.HandChess;
            if (n && n.length)
                for (let a = 0; a < n.length; a++) {
                    let r = n[a];
                    if (!r)
                        continue;
                    let l = e.GetMinionTyp(t);
                    r.chessID == e.CardID ? i.push(r) : s && -1 == s.indexOf(r.chessID) || l == TavernChessMinionType.CHESSMTGod ? r.isWildCard && l != TavernChessMinionType.CHESSMTGod && i.push(r) : i.push(r)
                }
            return i
        }
        deleteShopGoods(e) {
            let t = -1;
            return this.shopGoods.some((i, s) => {
                if (i && i.goodsID == e)
                    return t = s, 0
            }),
            -1 != t && (this.shopGoods[t] = null),
            t
        }
        deleteHandGoods(e) {
            this.selfInfo && this.selfInfo.DelHandChess(e)
        }
        deleteChessGoods(e) {
            this.selfInfo && this.selfInfo.DelLineUpChess(e)
        }
        onStageVisibility() {
            Laya.stage.isVisibility ? TavernChessGameContext.HasFight && TavernChessGameContext.ResumeGameProcessing() : this.phase != TavernChessPhaseType.StartBattle && this.phase != TavernChessPhaseType.InBattle || TavernChessGameContext.PauseGameProcessing()
        }
        GetSelfChessByGoodID(e) {
            return this.selfInfo ? this.selfInfo.GetChessByGoodID(e) : null
        }
        GetChessPlayerByGeneralID(e) {
            if (this.playerList && this.playerList.length)
                for (let t = 0; t < this.playerList.length; t++) {
                    let i = this.playerList[t];
                    if (i && i.generalID == e)
                        return i
                }
            return null
        }
        GetChessPlayerByUID(e) {
            if (this.playerList && this.playerList.length)
                for (let t = 0; t < this.playerList.length; t++) {
                    let i = this.playerList[t];
                    if (i && i.userID == e)
                        return i
                }
            return null
        }
        GetPlayerGeneralIDByUID(e) {
            if (this.playerList && this.playerList.length)
                for (let t = 0; t < this.playerList.length; t++) {
                    let i = this.playerList[t];
                    if (i && i.userID == e)
                        return i.generalID
                }
            return 0
        }
        GetChessPlayers() {
            return this.playerList && this.playerList.length ? this.playerList : []
        }
        GetHeadInfoByRank(e) {
            if (this.headInfoList && this.headInfoList.length)
                for (let t = 0; t < this.headInfoList.length; t++) {
                    let i = this.headInfoList[t];
                    if (i && i.rank == e)
                        return i
                }
            return null
        }
        GetHeadInfoByUID(e) {
            if (!e)
                return null;
            this.headInfoList || (this.headInfoList = []);
            for (let t = 0; t < this.headInfoList.length; t++) {
                let i = this.headInfoList[t];
                if (i && i.userID == e)
                    return i
            }
            let t = {
                userID: e
            };
            return this.headInfoList.push(t),
            t
        }
        GetNewestHpByUID(e) {
            if (this.serverRankDataList && this.serverRankDataList.length)
                for (let t = 0; t < this.serverRankDataList.length; t++) {
                    let i = this.serverRankDataList[t];
                    if (i && i.userID == e)
                        return i.isEscape || i.isDead ? 0 : i.hp
                }
            return 0
        }
        GetServerRankDataByUID(e) {
            if (this.serverRankDataList && this.serverRankDataList.length)
                for (let t = 0; t < this.serverRankDataList.length; t++) {
                    let i = this.serverRankDataList[t];
                    if (i && i.userID == e)
                        return i.initRank = t, i
                }
            return null
        }
        get ServerRankDataList() {
            return this.serverRankDataList
        }
        updateHeadInfoGeneralID(e, t) {
            this.GetHeadInfoByUID(e).generalID = t
        }
        updateHeadInfoExcludeHp(e, t) {
            let i = this.GetHeadInfoByUID(e);
            for (const e in t)
                if (Object.prototype.hasOwnProperty.call(t, e)) {
                    const s = t[e];
                    "hp" != e && (i[e] = s)
                }
        }
        sortHealList() {
            this.headInfoList && this.headInfoList.length && (this.headInfoList.sort((e, t) => {
                    let i = e.isEscape || e.isDead ? 0 : e.hp || 0,
                    s = t.isEscape || t.isDead ? 0 : t.hp || 0;
                    i < 0 && (i = 0),
                    s < 0 && (s = 0);
                    let a = i && e.hpLimit ? i / e.hpLimit : 0,
                    n = s && t.hpLimit ? s / t.hpLimit : 0;
                    return a < 0 && (a = 0),
                    n < 0 && (n = 0),
                    a != n ? n - a : i != s ? s - i : e.initRank != t.initRank ? e.initRank - t.initRank : void 0
                }), this.headInfoList.forEach((e, t) => {
                    e.rank = t
                }))
        }
        updateHeadInfoHp(e, t) {
            this.GetHeadInfoByUID(e).hp = t
        }
        updateHeadInfo(e, t) {
            let i = this.GetHeadInfoByUID(e);
            for (const e in t)
                if (Object.prototype.hasOwnProperty.call(t, e)) {
                    const s = t[e];
                    i[e] = s
                }
        }
        updatePlayer(e) {
            if (!e || !e.userID)
                return;
            this.playerList || (this.playerList = []);
            let t = !1;
            for (let i = 0; i < this.playerList.length; i++) {
                let s = this.playerList[i];
                s && s.userID == e.userID && (this.playerList[i] = e, t = !0)
            }
            t || this.playerList.push(e),
            e.userID == TavernChessGameContext.SelfUserID && (this.selfInfo || (this.selfInfo = new TavernChessPlayer), TavernChessGameReplayManager.GetInstance().IsReplay ? (this.selfInfo.hp = e.hp, this.selfInfo.userID = e.userID) : this.selfInfo.UpdateData(e))
        }
        updateLastRoundPlayer(e) {
            if (!e || !e.userID)
                return;
            this.lastRoundPlayerList || (this.lastRoundPlayerList = []);
            let t = !1;
            for (let i = 0; i < this.lastRoundPlayerList.length; i++) {
                let s = this.lastRoundPlayerList[i];
                s && s.userID == e.userID && (this.lastRoundPlayerList[i] = e, t = !0)
            }
            t || this.lastRoundPlayerList.push(e)
        }
        getLastRoundPlayerByUID(e) {
            if (this.lastRoundPlayerList && this.lastRoundPlayerList.length)
                for (let t = 0; t < this.lastRoundPlayerList.length; t++) {
                    let i = this.lastRoundPlayerList[t];
                    if (i && i.userID == e)
                        return i
                }
            return null
        }
        get IsPlayCompositeAni() {
            return this.isPlayCompositeAni
        }
        set IsPlayCompositeAni(e) {
            this.isPlayCompositeAni = e
        }
        set CanOperate(e) {
            this.canOperate = e
        }
        get CanOperate() {
            let e = this.canOperate;
            return e && TavernChessGameContext.IsViewer && (e = !1, UIUtils.ShowTextPrompt(words.TAVERN_CHESS_LOOKON_TIP2)),
            e && this.Phase != TavernChessPhaseType.InRecruit && (e = !1, UIUtils.ShowTextPrompt(words.TAVERN_CHESS_OPERATE_ERROR_3)),
            e && this.waitSelectEquiments && this.waitSelectEquiments.length && (e = !1, UIUtils.ShowTextPrompt(words.TAVERN_CHESS_OPERATE_ERROR_1)),
            e && this.waitSelectCards && this.waitSelectCards.length && (e = !1, UIUtils.ShowTextPrompt(words.TAVERN_CHESS_OPERATE_ERROR_2)),
            e && this.SelfInfo.chessPlayerSkillInfo && this.SelfInfo.chessPlayerSkillInfo.diQingSelectSkill && this.SelfInfo.chessPlayerSkillInfo.diQingSelectSkill.length > 0 && (e = !1, UIUtils.ShowTextPrompt(words.TAVERN_CHESS_OPERATE_ERROR_5)),
            e
        }
        get CanLockShop() {
            return !(this.waitSelectEquiments && this.waitSelectEquiments.length || this.waitSelectCards && this.waitSelectCards.length) || this.Phase != TavernChessPhaseType.InRecruit
        }
        GetEquipSkillHtmlDesc(e, t) {
            if (!e)
                return "";
            let i = TavernChessConfiger.GetInstance().GetEquipSkillBySkillID(e.WeaponSkill);
            if (!i)
                return "";
            if (!i.WeaponSkillSecondDesc)
                return i.WeaponSkillDesc;
            let s = 0;
            if (t && t.equipments)
                for (let a = 0; a < t.equipments.length; a++) {
                    let n = t.equipments[a];
                    if (i.WeaponSkillNameType && i.WeaponSkillNameType == TavernChessWeaponSkillNameType.CWSNTYuXi && i.Opportunity == TavernChessTriggerType.CHESSTTMaiWuJIangPaiShi && i.SkillData && i.SkillData.ActiveRound) {
                        s = n.skillProgress,
                        s < 0 && (s = 0);
                        break
                    }
                    if (n && n.equipmentID == e.WeaponID) {
                        s = n.skillProgress || 0;
                        break
                    }
                }
            return i.WeaponSkillDesc + StringUtils.Format(i.WeaponSkillSecondDesc, s)
        }
        GetGeneralSkillHtmlDesc(e, t) {
            if (!e)
                return "";
            if (!e.GeneralSkillSecondDesc)
                return e.SkillDesc;
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETLiGuang) {
                let i = e.SkillData ? e.SkillData.Count : 1,
                s = i - (t && t.chessPlayerSkillInfo ? t.chessPlayerSkillInfo.liGuangUseChessNum : 0);
                return s <= 0 && (s = i),
                e.SkillDesc + StringUtils.Format(e.GeneralSkillSecondDesc, s)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETTuShe) {
                let i = (e.SkillData ? e.SkillData.Count : 3) - (t && t.chessPlayerSkillInfo ? t.chessPlayerSkillInfo.refreshShopFreeTimes : 0);
                return i <= 0 && (i = 0),
                e.SkillDesc + StringUtils.Format(e.GeneralSkillSecondDesc, i)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETFangQuan) {
                let i = t && t.chessPlayerSkillInfo ? t.chessPlayerSkillInfo.triggerFangQuanTimes : 0;
                return i <= 0 && (i = 0),
                e.SkillDesc + StringUtils.Format(e.GeneralSkillSecondDesc, i)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETZhiMin) {
                let i = t && t.chessPlayerSkillInfo ? t.chessPlayerSkillInfo.triggerFangQuanTimes : 0;
                return i <= 0 && (i = 0),
                e.SkillDesc + StringUtils.Format(e.GeneralSkillSecondDesc, i)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETHuangTian) {
                let i = 0;
                return i = this.Phase == TavernChessPhaseType.InBattle || this.Phase == TavernChessPhaseType.StartBattle || this.Phase == TavernChessPhaseType.EndBattle ? t.userID == TavernChessGameContext.SelfUserID ? this.selfLordSkillData ? this.selfLordSkillData.zhangJiaoDeadCount : this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.lordSkillData ? this.selfInfo.chessPlayerSkillInfo.lordSkillData.zhangJiaoDeadCount : 0 : this.enmyLordSkillData ? this.enmyLordSkillData.zhangJiaoDeadCount : this.battlePlayerInfo && this.battlePlayerInfo.chessPlayerSkillInfo && this.battlePlayerInfo.chessPlayerSkillInfo.lordSkillData ? this.battlePlayerInfo.chessPlayerSkillInfo.lordSkillData.zhangJiaoDeadCount : 0 : this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.lordSkillData ? this.selfInfo.chessPlayerSkillInfo.lordSkillData.zhangJiaoDeadCount : 0,
                e.SkillDesc + StringUtils.Format(e.GeneralSkillSecondDesc, i)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETLuBan) {
                let i = TavernChessZhuGongSkillManager.GetInstance().GetInstanceClass(e, t);
                if (i && i.Activated)
                    return e.SkillDesc;
                if (this.Equipments && this.Equipments.length >= 3)
                    return e.SkillDesc;
                let s = this.CurRound,
                a = 0,
                n = TavernChessConfiger.GetInstance().GlobalData.WeaponRound;
                if (n && n.length)
                    for (let e = 0; e < n.length; e++) {
                        let t = n[e];
                        if (t && t.Round > s) {
                            a = t.Round;
                            break
                        }
                        a = t.Round
                    }
                return e.SkillDesc + StringUtils.Format(e.GeneralSkillSecondDesc, a - s)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETCaiShi) {
                let i = t && t.chessPlayerSkillInfo && t.chessPlayerSkillInfo.recycleChessTimes || 0,
                s = e.SkillData && e.SkillData.Count ? e.SkillData.Count : 4;
                return e.SkillDesc + StringUtils.Format(e.GeneralSkillSecondDesc, i % s)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETRookieCaoCao) {
                let i = 0;
                i = this.Phase == TavernChessPhaseType.InBattle || this.Phase == TavernChessPhaseType.StartBattle || this.Phase == TavernChessPhaseType.EndBattle ? t.userID == TavernChessGameContext.SelfUserID ? this.selfLordSkillData ? this.selfLordSkillData.caoCaoSkillTriggerCount : this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.lordSkillData ? this.selfInfo.chessPlayerSkillInfo.lordSkillData.caoCaoSkillTriggerCount : 0 : this.enmyLordSkillData ? this.enmyLordSkillData.caoCaoSkillTriggerCount : this.battlePlayerInfo && this.battlePlayerInfo.chessPlayerSkillInfo && this.battlePlayerInfo.chessPlayerSkillInfo.lordSkillData ? this.battlePlayerInfo.chessPlayerSkillInfo.lordSkillData.caoCaoSkillTriggerCount : 0 : this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.lordSkillData ? this.selfInfo.chessPlayerSkillInfo.lordSkillData.caoCaoSkillTriggerCount : 0;
                let s = Math.floor(i / e.SkillData.Count) + 1;
                return StringUtils.Format(e.GeneralSkillSecondDesc, s, s)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETDongZhuoS8) {
                let i = t && t.chessPlayerSkillInfo && t.chessPlayerSkillInfo.functionParam || {},
                s = i && i[TavernChessFunctionVariableType.CFVTCurGameGeneralHurtTime] ? i[TavernChessFunctionVariableType.CFVTCurGameGeneralHurtTime] : 0,
                a = e.SkillData ? e.SkillData.Count : 1,
                n = e.SkillData ? e.SkillData.Count2 : 1,
                r = a + s * n;
                return StringUtils.Format(e.GeneralSkillSecondDesc, r, n)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETS9DongZhuo) {
                let i = t && t.chessPlayerSkillInfo && t.chessPlayerSkillInfo.functionParam || {},
                s = i && i[TavernChessFunctionVariableType.CFVTGetArmorCount] ? i[TavernChessFunctionVariableType.CFVTGetArmorCount] : 0,
                a = e.SkillData ? e.SkillData.Count : 1,
                n = e.SkillData ? e.SkillData.Count2 : 1,
                r = e.SkillData ? e.SkillData.Count3 : 1,
                l = a + Math.floor(s / n) * r;
                return StringUtils.Format(e.GeneralSkillSecondDesc, l, n, r)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETHouYi) {
                let i = 0;
                i = this.Phase == TavernChessPhaseType.InBattle || this.Phase == TavernChessPhaseType.StartBattle || this.Phase == TavernChessPhaseType.EndBattle ? t.userID == TavernChessGameContext.SelfUserID ? this.selfLordSkillData ? this.selfLordSkillData.houYiKillCount : this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.lordSkillData ? this.selfInfo.chessPlayerSkillInfo.lordSkillData.houYiKillCount : 0 : this.enmyLordSkillData ? this.enmyLordSkillData.houYiKillCount : 0 : this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.lordSkillData ? this.selfInfo.chessPlayerSkillInfo.lordSkillData.houYiKillCount : 0;
                let s = e.GeneralSkillSecondDesc.split("|"),
                a = "";
                return a = i < e.SkillData.Count ? s[0] : s[1],
                StringUtils.Format(a, i)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETChengJiSiHan) {
                let i;
                i = this.Phase == TavernChessPhaseType.InBattle || this.Phase == TavernChessPhaseType.StartBattle || this.Phase == TavernChessPhaseType.EndBattle ? t.userID == TavernChessGameContext.SelfUserID ? this.selfLordSkillData ? this.selfLordSkillData.chengJiSiHan : this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.lordSkillData ? this.selfInfo.chessPlayerSkillInfo.lordSkillData.chengJiSiHan : null : this.enmyLordSkillData ? this.enmyLordSkillData.chengJiSiHan : null : this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.lordSkillData ? this.selfInfo.chessPlayerSkillInfo.lordSkillData.chengJiSiHan : null;
                let s = "",
                a = this.ChessMinionTypList,
                n = e.SkillData.Count;
                return a.forEach(e => {
                    let t = i && i[e] || 0;
                    s += StringUtils.Format(words.CHENG_JI_SI_HAN_TIP1, TavernChessStatic.GetChessCountryName(e), Math.max(0, n - t))
                }),
                s = s.slice(0, -1),
                e.SkillDesc + StringUtils.Format(e.GeneralSkillSecondDesc, s)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETLiBai) {
                let i = t && t.chessPlayerSkillInfo ? t.chessPlayerSkillInfo.liBaiUseChessCount : 0;
                return i <= 0 && (i = 0),
                e.SkillDesc + StringUtils.Format(e.GeneralSkillSecondDesc, i)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETJiangZiYa) {
                let t = e.SkillData ? e.SkillData.Count : 5,
                i = 0;
                if (this.selfInfo.chessPlayerSkillInfo) {
                    let e = TavernChessGameContext.GetLordSkillJiangZiYaData(this.selfInfo.chessPlayerSkillInfo.lordSkillData);
                    i = e ? e.count : 0
                }
                return e.SkillDesc + StringUtils.Format(e.GeneralSkillSecondDesc, i, t)
            }
            if (e.SkillEffectType == TavernChessGeneralSkillEffectType.CHESSGSETS10ZhangJiao) {
                let i = 0;
                return i = this.Phase == TavernChessPhaseType.InBattle || this.Phase == TavernChessPhaseType.StartBattle || this.Phase == TavernChessPhaseType.EndBattle ? t.userID == TavernChessGameContext.SelfUserID ? this.selfLordSkillData ? this.selfLordSkillData.zhangJiaoS10DeadCount : this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.lordSkillData ? this.selfInfo.chessPlayerSkillInfo.lordSkillData.zhangJiaoS10DeadCount : 0 : this.enmyLordSkillData ? this.enmyLordSkillData.zhangJiaoS10DeadCount : this.battlePlayerInfo && this.battlePlayerInfo.chessPlayerSkillInfo && this.battlePlayerInfo.chessPlayerSkillInfo.lordSkillData ? this.battlePlayerInfo.chessPlayerSkillInfo.lordSkillData.zhangJiaoS10DeadCount : 0 : this.selfInfo.chessPlayerSkillInfo && this.selfInfo.chessPlayerSkillInfo.lordSkillData ? this.selfInfo.chessPlayerSkillInfo.lordSkillData.zhangJiaoS10DeadCount : 0,
                e.SkillDesc + StringUtils.Format(e.GeneralSkillSecondDesc, i)
            }
        }
        GetCardSkillHtmlDesc(e, t) {
            if (!e)
                return "";
            if (!e.ChessSkillSecondDesc || !e.ChessSkill)
                return e.HtmlChessSkillDesc;
            let i = e.ChessSkillSecondDesc,
            s = t && t.chessPlayerSkillInfo && t.chessPlayerSkillInfo.functionParam || {},
            a = new RegExp("{(.*?)}"),
            n = i.match(a),
            r = n ? n[0] : "",
            l = s[n ? n[1] : ""] || 0;
            return e.HtmlChessSkillDesc + i.replace(r, l.toString())
        }
        get AlivePlayerCnt() {
            let e = 0;
            if (this.playerList && this.playerList.length)
                for (let t = 0; t < this.playerList.length; t++) {
                    let i = this.playerList[t];
                    i && i.hp > 0 && e++
                }
            return e
        }
        get NeedYuShiZiEffectLevel() {
            if (this.selfInfo && this.selfInfo.equipments && this.selfInfo.equipments.length) {
                let e = this.selfInfo.equipments;
                for (let t = 0; t < e.length; t++) {
                    let i = e[t];
                    if (!i)
                        continue;
                    let s = TavernChessConfiger.GetInstance().GetEquipByEquipID(i.equipmentID);
                    if (!s)
                        continue;
                    let a = TavernChessConfiger.GetInstance().GetEquipSkillBySkillID(s.WeaponSkill);
                    if (a && (a.SkillData && a.WeaponSkillNameType == TavernChessWeaponSkillNameType.CWSNTZhaoYeYuShiZi && a.Opportunity == TavernChessTriggerType.CHESSTTShopLevelUp && this.ShopCurLevel == a.SkillData.shopLevelLimit - 1))
                        return !0
                }
            }
            return !1
        }
        CheckNeedCiXiongShuangGuJianEffect(e) {
            if (e == TavernChessMinionType.CHESSMTGod)
                return !1;
            TavernChessWeaponSkillEffectType.CHESSWSETChessCopy;
            if (this.selfInfo && this.selfInfo.equipments && this.selfInfo.equipments.length) {
                let e = this.selfInfo.equipments;
                for (let t = 0; t < e.length; t++) {
                    let i = e[t];
                    if (!i)
                        continue;
                    let s = TavernChessConfiger.GetInstance().GetEquipByEquipID(i.equipmentID);
                    if (!s)
                        continue;
                    let a = TavernChessConfiger.GetInstance().GetEquipSkillBySkillID(s.WeaponSkill);
                    if (a && (a.SkillData && (a.WeaponSkillNameType == TavernChessWeaponSkillNameType.CWSNTCiXiongShuangGuJian || a.WeaponSkillNameType == TavernChessWeaponSkillNameType.CWSNTS3WuLiuJian) && a.Opportunity == TavernChessTriggerType.CHESSTTMaiWJPaiShi && i.skillProgress == a.SkillData.buyChessNum - 1))
                        return !0
                }
            }
            return !1
        }
        GetCopyEffectName() {
            if (this.selfInfo && this.selfInfo.equipments && this.selfInfo.equipments.length) {
                let e = this.selfInfo.equipments;
                for (let t = 0; t < e.length; t++) {
                    let i = e[t];
                    if (!i)
                        continue;
                    let s = TavernChessConfiger.GetInstance().GetEquipByEquipID(i.equipmentID);
                    if (!s)
                        continue;
                    let a = TavernChessConfiger.GetInstance().GetEquipSkillBySkillID(s.WeaponSkill);
                    if (a && a.SkillData) {
                        if (a.WeaponSkillNameType == TavernChessWeaponSkillNameType.CWSNTCiXiongShuangGuJian)
                            return TavernChessEffectContext.SK_SHOP_CIXIONGJIAN;
                        if (a.WeaponSkillNameType == TavernChessWeaponSkillNameType.CWSNTS3WuLiuJian)
                            return TavernChessEffectContext.SK_SHOP_WULIUJIAN
                    }
                }
            }
        }
        checkSendEmojiEvent() {
            if (this.Phase == TavernChessPhaseType.InRecruit && this.emojiList && this.emojiList.length)
                for (; this.emojiList.length; ) {
                    let e = this.emojiList.shift();
                    this.event(TavernChessGameManager.UI_UPDATE_SEND_EMOJI_LIST, e)
                }
        }
        ReqChessLookOn(e) {
            let t = TimerManager.GetInstance().ServerTime,
            i = TavernChessConfiger.GetInstance().GlobalData.ChessLookOnSwitchInterval;
            if (!(e && e != TavernChessGameContext.LookOnUserID && this.lastLookOnTime && t - this.lastLookOnTime < i))
                if (TavernChessGameContext.IsViewer)
                    if (e != TavernChessGameContext.LookOnUserID && e) {
                        let t = this.cachedBattleEndTime ? this.cachedBattleEndTime.get(e) : 0,
                        i = TimerManager.GetInstance().ServerTime;
                        if (!t || i < t) {
                            let t = this.cachedUserBuff ? this.cachedUserBuff.get(e) : null;
                            if (t && t.length) {
                                TavernChessGameContext.LookOnUserID = e,
                                TavernChessGameContext.StopBattle(),
                                TavernChessGameContext.ClearQueue(),
                                TavernChessGameContext.ClearDelCardInfo();
                                let s = this.cachedUserIds.get(e);
                                if (t.forEach(e => {
                                        this.dealChessBattleMsg(e.IsBegin, e.MsgBuff, e.IsOver, s)
                                    }), i < this.battleEndTime && TavernChessGameContext.LookonResumeGameProcessing())
                                    return this.lastLookOnTime = TimerManager.GetInstance().ServerTime, this.event(TavernChessGameManager.UI_UPDATE_BATTLE_PLAYER), this.event(TavernChessGameManager.SWITCH_LOOKON), void WindowManager.GetInstance().CloseWindow("TavernChessGeneralTipsWindow")
                            }
                        }
                        this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSLOOKON, {
                            tableID: this.TableID,
                            lookOnUserID: e
                        })
                    } else
                        this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSLOOKON, {
                            tableID: this.TableID,
                            lookOnUserID: e
                        });
                else
                    this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSLOOKON, {
                        tableID: this.TableID,
                        lookOnUserID: e
                    })
        }
        onRespChessLookOn(e) {
            if (!this.checkMsg(e))
                return;
            this.lastLookOnTime = TimerManager.GetInstance().ServerTime;
            let t = e.Protocol,
            i = t.ProtoData.lookOnUserID;
            t.errCode ? this.NeedQuiteLookOn || UIUtils.ShowProtocolResult(t.errCode) : (TavernChessGameContext.LookOnUserID != i && this.event(TavernChessGameManager.SWITCH_LOOKON), this.startLookOnFlag = !0, this.isAllGameOver = !1, this.battleEndProtoData = null, this.bGameGameOver = !1, this.waitSelectEquiments = null, TavernChessGameContext.IsLeave = !1, this.clearEndRecruit(), TavernChessGameContext.StopBattle(), TavernChessGameContext.ClearQueue(), TavernChessGameContext.ClearCardQueue(), this.ClearCachedChessData(), TavernChessGameContext.ClearDelCardInfo(), TavernChessGameContext.IsViewer = !0, this.EndWheel(), TavernChessGameContext.LookOnUserID = i, WindowManager.GetInstance().CloseWindow("TavernChessGameOverWindow"), WindowManager.GetInstance().CloseWindow("TavernChessGeneralTipsWindow"))
        }
        ReqChessQuiteLookOn() {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSQUITELOOKON, {
                tableID: this.TableID
            })
        }
        onRespChessQuiteLookOn(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            t.errCode ? UIUtils.ShowProtocolResult(t.errCode) : (TavernChessGameContext.IsViewer = !1, TavernChessGameContext.StopBattle(), this.BattleBack())
        }
        onNotifyChessQuiteLookOn(e) {
            if (!this.checkMsg(e))
                return;
            0 != e.Protocol.ProtoData.whyQuite ? (this.needQuiteLookOn = !0, TavernChessGameContext.IsInbattle || this.startFlag || WindowManager.GetInstance().GetWindow("TavernChessGameOverWindow").Show()) : this.BattleBack()
        }
        ReqChessLookOnHeartBeat(e) {
            TavernChessGameContext.IsViewer && !this.needQuiteLookOn && e - this.lastHeartBeatTime >= TavernChessGameManager.LOOKON_HEARTBEAT_DISTANCE && (this.lastHeartBeatTime = this.getBrowserNow(), this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSLOOKONHEARTBEAT, {
                    tableID: this.TableID
                }))
        }
        getBrowserNow() {
            return Laya.Browser.now() / 1e3 | 0
        }
        get NeedQuiteLookOn() {
            if (TavernChessGameContext.IsViewer && this.needQuiteLookOn)
                return this.needQuiteLookOn; {
                let e = !0;
                return !!(this.battleEndProtoData && this.battleEndProtoData.rank <= 2) || (this.serverRankDataList && this.serverRankDataList.some(t => {
                        if (!t.isEscape && !t.isDead && !t.isRobot)
                            return e = !1, !0
                    }), e)
            }
        }
        get LastLookOnTime() {
            return this.lastLookOnTime
        }
        get StartLookOnFlag() {
            return this.startLookOnFlag
        }
        autoSwitchLookOn() {
            this.battleEndProtoData.gameOver ? this.NeedQuiteLookOn ? this.PlayFirstKillAni() || this.PlayEnterNotify() : this.PlayFirstKillAni() || this.ReqChessLookOn(0) : this.PlayFirstKillAni() || this.ReqChessLookOn(TavernChessGameContext.SelfUserID)
        }
        checkMsg(e) {
            if (TavernChessGameReplayManager.GetInstance().IsReplay)
                return !0;
            if (TavernChessGameGuideManager.GetInstance().IsLastStage)
                return !0;
            let t = e.Protocol.ProtoData;
            return !t.tableID || t.tableID == this.TableID
        }
        set LastUseJingNangID(e) {
            this.lastUseJingNangID = e
        }
        get LastUseJingNangID() {
            return this.lastUseJingNangID
        }
        ReqDeleteEquip(e, t) {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQCHESSDELETEEQUIPMENT, {
                tableID: this.TableID,
                equipmentID: e,
                isPreselection: t,
                isPre: !0
            })
        }
        GetSpellRevertEffectTurn(e, t) {
            let i = 0,
            s = 1,
            a = -1;
            if (this.useDelaySpellInfo && this.useDelaySpellInfo.length)
                for (let n = this.useDelaySpellInfo.length - 1; n >= 0; n--) {
                    let r = this.useDelaySpellInfo[n];
                    if (r && r.spellID == e && a != r.turns) {
                        if (a = r.turns, s == t) {
                            i = r.turns;
                            break
                        }
                        s++
                    }
                }
            return i
        }
        GetDelaySpellEffectCnt(e, t) {
            let i = 0;
            if (TavernChessConfiger.GetInstance().GetSpellEffectTypeBySpellID(e) == TavernChessSpellSkillEffectType.CHESSSSETAllGetMoney)
                return this.allGetMoneySpellCount;
            if (this.useDelaySpellInfo && this.useDelaySpellInfo.length)
                for (let s = 0; s < this.useDelaySpellInfo.length; s++) {
                    let a = this.useDelaySpellInfo[s];
                    a && a.spellID == e && a.turns == t && i++
                }
            return i
        }
        GetSpellEffectTurn(e, t) {
            let i = 0,
            s = 1;
            if (this.useDelaySpellInfo && this.useDelaySpellInfo.length)
                for (let a = 0; a < this.useDelaySpellInfo.length; a++) {
                    let n = this.useDelaySpellInfo[a];
                    if (n && n.spellID == e) {
                        if (s == t) {
                            i = n.turns;
                            break
                        }
                        s++
                    }
                }
            return i
        }
        GetLastSpellEffectTurn(e) {
            let t = 0,
            i = this.useDelaySpellInfo.slice();
            if (i && i.length)
                for (let s = 0; s < i.length; s++) {
                    let a = i[s];
                    if (a && a.spellID == e) {
                        t = a.turns;
                        break
                    }
                }
            return t
        }
        onRespChessDeleteEquipment(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.equipmentID,
            s = t.ProtoData.isPreselection;
            s ? TavernChessGameContext.IsViewer && this.event(TavernChessGameManager.RESP_CHOOSE_EQUIP, [i, s]) : (this.bShowSelfEquipWindow = !1, this.CheckSanLianAni(), this.checkSanLianReq(), this.event(TavernChessGameManager.UI_UPDATE_SELECT_CARD))
        }
        ReqQuYuanChooseQuestionAnswer(e, t) {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQQUYUANCHOOSEQUESTIONANSWER, {
                tableID: this.TableID,
                questionID: e,
                answerID: t
            })
        }
        onRespQuYuanChooseQuestionAnswer(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            t.errCode && UIUtils.ShowProtocolResult(t.errCode)
        }
        onNotifyQuYuanChooseQuestionInfo(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            if (t.errCode)
                return void UIUtils.ShowProtocolResult(t.errCode);
            let i = t.ProtoData.info,
            s = (i.supportNum && i.supportNum > 0 ? i.supportNum : 0) > (this.QuestionInfo && this.QuestionInfo.supportNum > 0 ? this.QuestionInfo.supportNum : 0),
            a = (i.leafNum && i.leafNum > 0 ? i.leafNum : 0) > (this.QuestionInfo && this.QuestionInfo.leafNum > 0 ? this.QuestionInfo.leafNum : 0);
            if (this.QuestionInfo = i, t.ProtoData.sourceUserID > 0) {
                let e = 0;
                s && (e = 710040),
                a && (e = 710188),
                e > 0 && this.event(TavernChessGameManager.NOTIFY_CHESS_SEND_PROP, [this.QuestionInfo.userID, t.ProtoData.sourceUserID, e])
            } else
                this.QuestionInfo.userID != UserData.Self.ClientId && this.event(TavernChessGameManager.NOTIFY_QUYUAN_QUESTIONINFO)
        }
        get QuestionInfo() {
            return this.questionInfo
        }
        set QuestionInfo(e) {
            this.questionInfo = e
        }
        ReqQuYuanChooseQuestionGift(e, t) {
            this.proxy.SendProto(ProtoBufId.CMSG_CREQQUYUANCHOOSEQUESTIONGIFT, {
                tableID: this.TableID,
                targetUserID: e,
                giftTyp: t
            })
        }
        onRespQuYuanChooseQuestionGift(e) {
            if (!this.checkMsg(e))
                return;
            let t = e.Protocol;
            t.errCode && UIUtils.ShowProtocolResult(t.errCode)
        }
        destroy() {
            this.destoryed || (super.destroy(), this.destoryed = !0, TavernChessGameContext.IsViewer && this.ReqChessQuiteLookOn(), Laya.timer.clearAll(this), TavernChessZhuGongSkillManager.GetInstance().ClearData(), TavernChessGameContext.Clear(), TavernChessGameGuideManager.GetInstance().ExitGuide(), this.LineUpApply = !1, TavernChessLineupManager.GetInstance().FavorId && TavernChessLineupManager.GetInstance().ReqChessLineupCommendIDCancel(), TavernChessLineupManager.GetInstance().ClearLineUPScore())
        }
    }
