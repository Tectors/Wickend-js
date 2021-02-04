const nodeWick = require('node-wick');
const fs = require('fs');

const { Extractor, Package } = nodeWick;
const filter = (f) => f.endsWith('.pak');

/**
 * Easier way to use node-wick.
 * 
 * Version
 * - Node v14.15.0
 * - node-wick 5.0.0
 */
module.exports = class Wick {
    /**
     * @param {Object} data Settings.
     * @param {Boolean} data.extract If files are extracted when instance is created.
     * #### Default: true
     * - true
     * - false
     * @param {Object} data.chain AES Keys 
     * - https://benbotfn.tk/api/v1/aes
     * @param {String} data.path Path to the pak files.
     * @param {Object} data.extractors Extra extractors if you have any.
     * @param {Function} data.filter Filter of any file in the pak files.
     * - (f) => f.endsWith('.pak')
     * @param {Function} data.log Log function.
     */
    constructor(data={
        extract: true,
        chain: null,
        path: null,
        extractors: {},
        filter,
        log: console.log
    }) {
        /**
         * Path to the pak files.
         * 
         * @type String
         */
        this.path = data.path;

        /**
         * Extractors.
         * 
         * @type Extractor
         */
        this.extractors = data.extractors ? data.extractors : {};

        /**
         * AES keys.
         * 
         * @type Object
         */
        this.chain = data.chain;

        /**
         * If files have been extracted.
         */
        this.extracted = false;

        /**
         * Log function if there is any.
         * 
         * @type Function
         */
        this.log = data.log;

        /**
         * Sorting of data.
         * 
         * @type {Object}
         */
        this.sorting = {
            Characters: 'FortniteGame/Content/Athena/Items/Cosmetics/Characters/',
            Heroes: 'FortniteGame/Content/Athena/Heroes/HID_',
            Emotes: 'FortniteGame/Content/Athena/Items/Cosmetics/Dances/',
            Backpacks: 'FortniteGame/Content/Athena/Items/Cosmetics/Backpacks/',
            Specializations: 'FortniteGame/Content/Athena/Heroes/Specializations/',
            Series: 'FortniteGame/Content/Athena/Items/Cosmetics/Series/',
            Sprays: 'FortniteGame/Content/Athena/Items/Cosmetics/Sprays/',
            LoadingScreens: 'FortniteGame/Content/Athena/Items/Cosmetics/LoadingScreens/',
            Pickaxes: 'FortniteGame/Content/Athena/Items/Cosmetics/Pickaxes/',
            Weapons: 'FortniteGame/Content/Athena/Items/Weapons/',
            Ammo: 'FortniteGame/Content/Items/Ammo/AmmoData',
            Balance: 'FortniteGame/Content/Balance',
            Meta: 'FortniteGame/Content/Athena/Items/Cosmetics/Metadata/',
            Contrails: 'FortniteGame/Content/Athena/Items/Cosmetics/Contrails/',
            Wraps: 'FortniteGame/Content/Athena/Items/Cosmetics/ItemWraps/',
            Toys: 'FortniteGame/Content/Athena/Items/Cosmetics/Toys/',
            MusicPacks: 'FortniteGame/Content/Athena/Items/Cosmetics/MusicPacks/',
            Gliders: 'FortniteGame/Content/Athena/Items/Cosmetics/Gliders/',
            Banners: 'FortniteGame/Content/2dAssets/Banners/',
            Emojis: 'FortniteGame/Content/2dAssets/Emoji/',
            NpcItems: 'Plugins/GameFeatures/BattlepassS15/Content/Items/NpcItems/',
            NpcTables: 'Plugins/GameFeatures/BattlepassS15/Content/Balance/DataTables/',
            Quests: 'Plugins/GameFeatures/BattlepassS15/Content/Items/QuestItems/'
        }

        /**
         * Sorted data.
         * 
         * @type {Object}
         */
        this.sorted = {};

        /**
         * All files in the path.
         * 
         * @type Array
         */
        this.directory = fs.readdirSync(data.path).filter(data.filter || filter).map(f => f.split('.')[0]);
        
        /**
         * Package class from **node-wick**.
         * 
         * @type class
         */
        this.Package = Package;

        if(data.extract) {
            console.log('Auto extract has started an "extracted" property, wait for the property to become true.');
            console.log('You can always call the function and wait for the value to come back as that\'s easier.');
            this.extract();
        }
    }

    /**
     * Extracts all files in **directory** property defined in the *constructor*.
     * 
     * @returns Array
     */
    async extract() {
        const errors = {};

        await this.whiler(this.directory, (directory) => {
            const path = this.path + directory;

            return new Promise(async (resolve) => {
                const key = this.getKey(directory) || this.chain.mainKey;
                
                const extractor = await new Promise((resolve) => {
                    try {
                        resolve(new Extractor(path, key));
                    } catch(err) {
                        if(!errors[err.message]) errors[err.message] = [];
                        errors[err.message].push({directory, key});
                        if(this.log) this.log('\x1b[31m%s\x1b[0m', `Package ${directory} failed using ${key}`);
                        resolve(null);
                    }
                });

                if(extractor) {
                    if(this.extractors[directory]) return;
                    this.extractors[directory] = extractor;

                    const files = extractor.get_file_list();
                    this.sort(files, extractor);

                    if(this.log) this.log('\x1b[32m%s\x1b[0m', `Package ${directory} worked with key ${key}: ${files.length} files`);
    
                    resolve(true);
                } else resolve(null);
            });
        });

        if(this.log) {
            this.log('|', '\x1b[32mSTAT\x1b[0m', '\x1b[31mISTICS\x1b[0m'.replace(/ /g, ''), '|')
            this.log('\x1b[32m%s\x1b[0m', `${Object.keys(this.extractors).length} packages that successfully were extracted.`);
            this.log('\x1b[31m%s\x1b[0m', `${this.directory.length - Object.keys(this.extractors).length} packages that failed.`);

            if(Object.keys(errors).length > 0) {
                console.error(`List of errors that happened should be below.`);
                this.log(errors);
            }
        }

        if(Object.keys(errors).find(e => e.trim().startsWith('File Error: The system cannot find the file specified.') && errors[e].length > 30)) console.error('Too many not found pak files, make sure the path you provided is to the *Paks* folder and is correct, also include a extra \\\\ at the end of your path.');
        if(Object.keys(this.extractors).length === 0) return console.error('Failed to extract any files, make sure you have oo2core_8_win64 or any other kind of ddl, or if you\'re missing the pak files in the paks folder, only global files are needed to be in the paks folder.');

        this.extracted = true;
        return this.extractors;
    }

    /**
     * Sorts files.
     * 
     * @param {Array} files Array of files.
     * @param {Class} extractor Extractor class.
     */
    sort(files, extractor) {
        return new Promise(async (resolve) => {
            await this.whiler(Object.keys(this.sorting), (type) => {
                const value = Array.isArray(this.sorting[type]) ? this.sorting[type][0] : this.sorting[type];
                const filtered = !Array.isArray(this.sorting[type]) ? files.filter(f => f.startsWith(value)) : files.filter(f => f.startsWith(value) && f.includes(this.sorting[type][1]));

                if(filtered.length > 3) {
                    if(!this.sorted[type]) this.sorted[type] = {};

                    filtered.forEach((f) => {
                        try {
                            const raw = extractor.get_file(f);
                            const data = new Package(raw);
                            const json = data.get_data();
                            if(json.exports[0]) {
                                json._path = f;
                                json._name = f.split('/').pop().split('.')[0];
                                this.sorted[type][type === 'NpcItems' ? f.split('/').pop().split('.')[0].split('TandemCharacterData_')[1] : f.split('/').pop().split('.')[0]] = json;
                            }
                        } catch(error) {
                            console.error(error.message.replace(/\n/g, ''));
                        }
                    });

                    resolve(type);
                }

                return true;
            });

            resolve(null);
        });
    }

    /**
    getAllTandems(beautified=true) {
        return Object.keys(this.sorted.NpcItems).map((tandem) => this.getTandem(tandem, beautified));
    }
    */

    /**
     * Returns data about a Tandem.
     * 
     * @param {String} id Name of a Tandem.
     * @param {Boolean} beautified If the returned data is beautified or not.
     * @returns Object
     */
    getTandem(id, beautified=true) {
        if(!this.sorted.NpcItems[id]) return null;

        const { [id]: { exports, imported_packages, _path } } = this.sorted.NpcItems;

        const Tandem = exports[0];
        const CID = Tandem.EntryListIcon.asset_path_name && Tandem.EntryListIcon.asset_path_name.split('HID')[1] && Tandem.EntryListIcon.asset_path_name.split('HID')[1].split('.')[0] ? "CID" + Tandem.EntryListIcon.asset_path_name.split('HID')[1].split('.')[0].split('-L')[0].replace(/-/g, '_') : null;

        const NPCServices = this.sorted.NpcTables.NPCServices.exports[0];
        const NPCQuests = this.sorted.NpcTables.NPCQuests.exports[0];
        const NPCSales = this.sorted.NpcTables.NPCSales.exports[0];
        const LootData = this.sorted.NpcTables.AthenaNPCBundleLootTierData_Client.exports[0];

        const Services = Object.keys(NPCServices).map((key) => NPCServices[key]).filter(service => service.NPC && service.NPC.TagName === Tandem.GameplayTag.TagName);
        const Quests = Object.keys(NPCQuests).map((key) => NPCQuests[key]).filter(service => service.NPC && service.NPC.TagName === Tandem.GameplayTag.TagName).map((quest) => quest.Quest ? this.sorted.Quests[quest.Quest.asset_path_name.split('.')[1]].exports[0] : null);
        const Sales = Object.keys(NPCSales).map((key) => NPCSales[key]).filter(service => service.NPC && service.NPC.TagName === Tandem.GameplayTag.TagName).map(sale => {
            return LootData[Object.keys(LootData).find(l => l.startsWith(sale.LootTier))];;
        });

        const SalesBeautified = Sales.map((sale) => {
            return {
                group: sale.TierGroup,
                weight: sale.Weight,
                quotaLevel: sale.QuotaLevel,
                loot: {
                    tier: sale.LootTier,
                    package: sale.LootPackage,
                    previewPackage: sale.LootPreviewPackage,
                    numPackageDrops: sale.NumLootPackageDrops,
                    packageCategoryWeightArray: sale.LootPackageCategoryWeightArray,
                    packageCategoryMinArray: sale.LootPackageCategoryMinArray,
                    packageCategoryMaxArray: sale.LootPackageCategoryMaxArray,
                    allowBonusDrops: sale.bAllowBonusLootDrops
                },
                streakBreaker: {
                    currency: sale.StreakBreakerCurrency,
                    pointsMin: sale.StreakBreakerPointsMin,
                    pointsMax: sale.StreakBreakerPointsMax,
                    pointsSpend: sale.StreakBreakerPointsSpend
                },
                gameplayTags: sale.GameplayTags.gameplay_tags ? sale.GameplayTags.gameplay_tags : null,
                requiredGameplayTags: sale.RequiredGameplayTags.gameplay_tags ? sale.RequiredGameplayTags.gameplay_tags : null,
                annotation: sale.Annotation ? sale.Annotation : null,
            }
        });

        return !beautified ? {
            ...Tandem,
            Character: this.getCharacter(CID, false),
            Services,
            Quests,
            Sales
        } : {
            ...this.getItemDefaultData(Tandem, true),
            description: {
                tandem: Tandem.AdditionalDescription ? Tandem.AdditionalDescription.string : null,
                general: Tandem.GeneralDescription ? Tandem.GeneralDescription.string : null
            },
            name: Tandem.DisplayName ? Tandem.DisplayName.string : null,
            tag: Tandem.GameplayTag ? Tandem.GameplayTag.TagName : null,
            meta: {
                hire: Services.find(service => service.ServiceTag.TagName === 'Tandem.Service.Hire') ? true : false,
                bounty: Services.find(service => service.ServiceTag.TagName === 'Tandem.Service.PlayerBounty') ? true : false,
            },
            id: CID,
            locations: Tandem.POILocations ? Tandem.POILocations.gameplay_tags : null,
            character: CID ? this.getCharacter(CID) : null,
            services: Services.map(service => {
                return {
                    chance: service.Chance,
                    priority: service.Priority,
                    tag: service.ServiceTag.TagName,
                    ...service.ServiceTag.TagName.includes('Tandem.Service.Sell') ? {
                        sale: SalesBeautified[Number(service.ServiceTag.TagName.split('Tandem.Service.Sell')[1]) - 1]
                    } : {}
                }
            }),
            sales: SalesBeautified,
            quests: Quests.map(quest => {
                return {
                    ...this.getItemDefaultData(quest, true),
                    rewards: quest.HiddenRewards.map(reward => {
                        return {
                            id: reward.TemplateId,
                            quantity: reward.Quantity
                        }
                    }),
                    categories: quest.bIncludedInCategories,
                    profileType: quest.GrantToProfileType,
                    expiration: quest.ExpirationDuration,
                    type: quest.QuestType,
                    description: quest.ShortDescription.string,
                    completion: {
                        text: quest.CompletionText.string
                    },
                    objectives: quest.Objectives.map(objective => {
                        return {
                            ...this.getItemDefaultData(objective, true),
                            alternativeStatHandles: objective.AlternativeStatHandles,
                            meta: {
                                hidden: objective.bHidden,
                                requirePrimaryMissionCompletion: objective.bRequirePrimaryMissionCompletion,
                                canProgressInZone: objective.bCanProgressInZone,
                                canProgressInZone: objective.bCanProgressInZone,
                                count: objective.Count,
                                dynamic: {
                                    statusUpdateType: objective.DynamicStatusUpdateType,
                                    statusUpdatePercentInterval: objective.DynamicStatusUpdatePercentInterval,
                                    updateCompletionDelay: objective.DynamicUpdateCompletionDelay,
                                    displayAnnouncementUpdate: objective.bDisplayDynamicAnnouncementUpdate
                                },
                                itemEvent: objective.ItemEvent,
                                itemTemplateIdOverride: objective.ItemTemplateIdOverride,
                                link: {
                                    squadID: objective.LinkSquadID,
                                    squadIndex: objective.LinkSquadIndex,
                                    itemManagement: objective.LinkToItemManagement,
                                    linkVaultTab: objective.LinkVaultTab
                                },
                                stage: objective.Stage
                            },
                            backendName: objective.BackendName,
                            stats: objective.InlineObjectiveStats.map(stat => {
                                return {
                                    meta: {
                                        inclusive: {
                                            hasContextTags: stat.bHasInclusiveContextTags,
                                            hasSourceTags: stat.bHasInclusiveSourceTags,
                                            hasTargetTags: stat.bHasInclusiveTargetTags
                                        },
                                        templateIds: stat.TemplateIds,
                                    },
                                    condition: stat.Condition,
                                    type: stat.Type,
                                    conditions: stat.TagConditions.map(condition => {
                                        return {
                                            tag: condition.Tag ? condition.Tag.TagName : null,
                                            type: condition.Type ? condition.Type : null,
                                            required: condition.Require ? condition.Require : null,
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            })
        }
    }

    /**
     * Returns data about a Glider.
     * 
     * (Not case sensitive)
     * 
     * @param {String} GID ID of a Glider.
     * @param {Boolean} beautified If the returned data is beautified or not.
     * @returns Object
     */
    getGlider(GID, beautified=true) {
        const id = Object.keys(this.sorted.Gliders).find(c => c.toLowerCase() === GID.toLowerCase());
        if(!this.sorted.Gliders[id]) return null;

        const { [id]: { exports, imported_packages, _path } } = this.sorted.Gliders;

        const Glider = exports[0];
        const Set = Glider.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSetObject(Glider) : null;
        const Series = Glider.Series ? this.getSeries(Glider.Series.import) : null;

       return !beautified ? {
            ...Glider,
            Series,
            Set
        } : {
            ...this.getItemDefaultData(Glider),
            id,
            definition: {
                glider: _path
            },
            sounds: {
                open: Glider.OpenSound ? this.getItemDefaultData(Glider.OpenSound.asset_path_name) : null,
                close: Glider.CloseSound ? this.getItemDefaultData(Glider.CloseSound.asset_path_name) : null,
            }
        };
    }

    /**
     * Returns data about a Music Pack.
     * 
     * (Not case sensitive)
     * 
     * @param {String} MID ID of a Music Pack.
     * @param {Boolean} beautified If the returned data is beautified or not.
     * @returns Object
     */
    getMusicPack(MID, beautified=true) {
        const id = Object.keys(this.sorted.MusicPacks).find(c => c.toLowerCase() === MID.toLowerCase());
        if(!this.sorted.MusicPacks[id]) return null;

        const { [id]: { exports, imported_packages, _path } } = this.sorted.MusicPacks;

        const MusicPack = exports[0];
        const Set = MusicPack.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSetObject(MusicPack) : null;
        const Series = MusicPack.Series ? this.getSeries(MusicPack.Series.import) : null;

       return !beautified ? {
            ...MusicPack,
            Series,
            Set
        } : {
            ...this.getItemDefaultData(MusicPack),
            id,
            definition: {
                musicPack: _path
            },
            sound: MusicPack.FrontEndLobbyMusic ? this.replaceStringName(MusicPack.FrontEndLobbyMusic.asset_path_name) : null
        };
    }

    /**
     * Returns data about a Toy.
     * 
     * (Not case sensitive)
     * 
     * @param {String} TYID ID of a Toy.
     * @param {Boolean} beautified If the returned data is beautified or not.
     * @returns Object
     */
    getToy(TYID, beautified=true) {
        const id = Object.keys(this.sorted.Toys).find(c => c.toLowerCase() === TYID.toLowerCase());
        if(!this.sorted.Toys[id]) return null;

        const { [id]: { exports, imported_packages, _path } } = this.sorted.Toys;

        const Toy = exports[0];
        const Set = Toy.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSetObject(Toy) : null;
        const Series = Toy.Series ? this.getSeries(Toy.Series.import) : null;

       return !beautified ? {
            ...Toy,
            Series,
            Set
        } : {
            ...this.getItemDefaultData(Toy),
            id,
            definition: {
                toy: _path
            },
            animation: {
                male: this.replaceStringName(Toy.Animation.asset_path_name),
                cooldown: Toy.EmoteCooldownSecs
            }
        };
    }

    /**
     * Returns data about a Wrap.
     * 
     * (Not case sensitive)
     * 
     * @param {String} WID ID of a Wrap.
     * @param {Boolean} beautified If the returned data is beautified or not.
     * @returns Object
     */
    getWrap(WID, beautified=true) {
        const id = Object.keys(this.sorted.Wraps).find(c => c.toLowerCase() === WID.toLowerCase());
        if(!this.sorted.Wraps[id]) return null;

        const { [id]: { exports, imported_packages, _path } } = this.sorted.Wraps;

        const Wrap = exports[0];
        const Set = Wrap.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSetObject(Wrap) : null;
        const Series = Wrap.Series ? this.getSeries(Wrap.Series.import) : null;

       return !beautified ? {
            ...Wrap,
            Series,
            Set
        } : {
            ...this.getItemDefaultData(Wrap),
            id,
            definition: {
                wrap: _path
            }
        };
    }

    /**
     * Returns data about a Emote.
     * 
     * (Not case sensitive)
     * 
     * @param {String} EID ID of a emote.
     * @param {Boolean} beautified If the returned data is beautified or not.
     * @returns Object
     */
    getEmote(EID, beautified=true) {
        if(!this.sorted.Emotes[EID]) return null;
        const Emote = this.sorted.Emotes[EID].exports[0];

        const Series = Emote.Series ? this.getSeries(Emote.Series.import) : null;
        const Set = Emote.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSetObject(Backpack) : null;

        return !beautified ? {
            ...Emote,
            Animation: {
                Path: this.replaceStringName(Emote.Animation.asset_path_name),
                Cooldown: Emote.EmoteCooldownSecs
            },
            Series,
            Set
        } : {
            ...this.getItemDefaultData(Character),
            id: EID,
            images: {
                small: Emote.SmallPreviewImage ? this.replaceStringName(Emote.SmallPreviewImage.asset_path_name) : null,
                large: Emote.LargePreviewImage ? this.replaceStringName(Emote.LargePreviewImage.asset_path_name) : null,
                displayAsset: Emote.DisplayAssetPath ? this.replaceStringName(Emote.DisplayAssetPath.asset_path_name) : null
            },
            animation: {
                male: this.replaceStringName(Emote.Animation.asset_path_name),
                female: Emote.AnimationFemaleOverride ? this.replaceStringName(Emote.AnimationFemaleOverride.asset_path_name) : null,
                cooldown: Emote.EmoteCooldownSecs
            }
        }
    }

    /**
     * Returns data about a Pickaxe.
     * 
     * (Not case sensitive)
     * 
     * @param {String} PID ID of a Pickaxe.
     * @param {Boolean} beautified If the returned data is beautified or not.
     * @returns Object
     */
    getPickaxeID(PID, beautified=true) {
        const id = Object.keys(this.sorted.Pickaxes).find(c => c.toLowerCase() === PID.toLowerCase());
        if(!this.sorted.Pickaxes[id]) return null;

        const { [id]: { exports, imported_packages, _path } } = this.sorted.Pickaxes;

        const Pickaxe = exports[0];
        const Set = Pickaxe.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSetObject(Pickaxe) : null;
        const Series = Pickaxe.Series ? this.getSeries(Pickaxe.Series.import) : null;

        /* const WeaponDefinition = this.sorted.Weapons; */
        
        return !beautified ? {
            ...Pickaxe,
            Series,
            Set
        } : {
            ...this.getItemDefaultData(Pickaxe),
            images: {
                small: Pickaxe.SmallPreviewImage ? this.replaceStringName(Pickaxe.SmallPreviewImage.asset_path_name) : null,
                large: Pickaxe.LargePreviewImage ? this.replaceStringName(Pickaxe.LargePreviewImage.asset_path_name) : null,
                displayAsset: Pickaxe.DisplayAssetPath ? this.replaceStringName(Pickaxe.DisplayAssetPath.asset_path_name) : null
            },
            id,
            definition: {
                pickaxe: _path
            }
        };
    }

    /**
     * Get weapon.
     * 
     * (Not case sensitive)
     * 
     * @param {Object} id Weapon ID.
     * @returns {Object}
     */
    getWeapon(id, beautified=true) {
        id = Object.keys(this.sorted.Weapons).find(c => c.toLowerCase() === id.toLowerCase());
        if(!this.sorted.Weapons[id]) return null;

        const { [id]: { exports, imported_packages, _name } } = this.sorted.Weapons;

        const Weapon = exports[0];

        const { exports: AmmoExports, _name: ammoID } = this.sorted.Ammo[Weapon.AmmoData.asset_path_name.split('.')[1].replace(/Athena/, '')];

        const Ammo = AmmoExports[0];

        return !beautified ? {
            ...Weapon,
            Ammo
        } : {
            ...this.getItemDefaultData(Weapon),
            sounds: {
                drop: Weapon.DropSound ? this.replaceStringName(Weapon.DropSound.asset_path_name) : null,
                pickup: Weapon.PickupSound ? this.replaceStringName(Weapon.PickupSound.asset_path_name) : null,
                landed: Weapon.LandedSound ? this.replaceStringName(Weapon.LandedSound.asset_path_name) : null
            },
            meta: {
                alwaysCountForCollectionQuest: Weapon.bAlwaysCountForCollectionQuest,
                canBeStolen: Weapon.bItemCanBeStolen,
                HasDurability: Weapon.bItemHasDurability,
                should: {
                    usePerfectAimWhenTargetingMinSpread: Weapon.bShouldUsePerfectAimWhenTargetingMinSpread,
                    spawnBulletShellFX: Weapon.bShouldSpawnBulletShellFX
                },
                showDirectionalArrowWhenFarOff: Weapon.bShowDirectionalArrowWhenFarOff,
                targetingPreventsReload: Weapon.bTargetingPreventsReload,
                traceThroughPawns: Weapon.bTraceThroughPawns,
                preventDefaultPreload: Weapon.bPreventDefaultPreload,
                neverPersisted: Weapon.bNeverPersisted,
                showReticleHitNotifyAtImpactLocation: Weapon.bShowReticleHitNotifyAtImpactLocation,
                showReticleHitNotifyAtImpactLocation: Weapon.bShowReticleHitNotifyAtImpactLocation,
            },
            tier: Weapon.Tier,
            searchTags: Weapon.SearchTags ? Weapon.SearchTags.string.split(' ') : null,
            type: {
                display: Weapon.SearchTags ? Weapon.SearchTags.string.split(' ')[0].slice(0, -1) : null,
                value: Weapon.SearchTags ? Weapon.SearchTags.string.split(' ')[0].slice(0, -1).toLowerCase() : null
            },
            ammo: {
                ...this.getItemDefaultData(Ammo, true),
                images: this.getImages(Ammo),
                sounds: {
                    drop: Ammo.DropSound ? this.replaceStringName(Ammo.DropSound.asset_path_name) : null,
                    pickup: Ammo.PickupSound ? this.replaceStringName(Ammo.PickupSound.asset_path_name) : null,
                    landed: Ammo.LandedSound ? this.replaceStringName(Ammo.LandedSound.asset_path_name) : null
                },
                max: Ammo.MaxStackSize.Value,
                type: {
                    display: 'Ammo',
                    value: 'ammo'
                },
                id: ammoID,
                name: Ammo.DisplayName.string.split('Ammo: ')[1],
                dropCount: Ammo.DropCount,
                meta: {
                    showDirectionalArrowWhenFarOff: Ammo.bShowDirectionalArrowWhenFarOff,
                    supportsQuickbarFocus: Ammo.bSupportsQuickbarFocus,
                    triggersFeedbackLines: Ammo.bTriggersFeedbackLines
                },
                searchTags: Ammo.SearchTags ? Ammo.SearchTags.string.split(' ') : null,
            },
            actualAnalyticNames: Weapon.ActualAnalyticFNames,
            analyticTags: Weapon.AnalyticTags.gameplay_tags,
            id: _name,
            creativeTagsHelper: Weapon.CreativeTagsHelper ? Weapon.CreativeTagsHelper.CreativeTags : null
        }
    }

    /**
     * Returns data about a Back Pack.
     * 
     * (Not case sensitive)
     * 
     * @param {String} BID ID of a Back Pack.
     * @param {Boolean} beautified If the returned data is beautified or not.
     * @returns Object
     */
    getBackPack(BID, beautified=true) {
        const id = Object.keys(this.sorted.Backpacks).find(c => c.toLowerCase() === BID.toLowerCase());
        if(!this.sorted.Backpacks[id]) return null;

        const { [id]: { exports, imported_packages, _path } } = this.sorted.Backpacks;

        const Backpack = exports[0];
        const Set = Backpack.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSetObject(Backpack) : null;
        const Series = Backpack.Series ? this.getSeries(Backpack.Series.import) : null;

        const Meshes = [];
        const Parts = [];

        Backpack.CharacterParts.forEach((part) => {
            /* console.log(partw) */
        });
        
       return !beautified ? {
            ...Backpack,
            Parts,
            Meshes,
            Series,
            Set
        } : {
            ...this.getItemDefaultData(Backpack),
            id,
            definition: {
                backbling: _path
            }
        };
    }

    /**
     * Returns data about a Spray.
     * 
     * (Not case sensitive)
     * 
     * @param {String} SPID ID of a Spray.
     * @param {Boolean} beautified If the returned data is beautified or not.
     * @returns Object
     */
    getSpray(SPID, beautified=true) {
        const id = Object.keys(this.sorted.Sprays).find(c => c.toLowerCase() === SPID.toLowerCase());
        if(!this.sorted.Sprays[id]) return null;

        const { [id]: { exports, imported_packages, _path } } = this.sorted.Sprays;

        const Spray = exports[0];
        const Set = Spray.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSetObject(Spray) : null;
        const Series = Spray.Series ? this.getSeries(Spray.Series.import) : null;

       return !beautified ? {
            ...Spray,
            Series,
            Set
        } : {
            ...this.getItemDefaultData(Spray),
            id,
            definition: {
                spray: _path,
                material: Spray.DecalMaterial ? this.replaceStringName(Spray.DecalMaterial.asset_path_name) : null
            }
        };
    }

    /**
     * Get Loading Screen by ID.
     * 
     * (Not case sensitive)
     * 
     * @param LSID The ID of a Loading Screen.
     * @param beautified If the returned json looks good or not.
     * @returns Object
     */
    getLoadingScreen(LSID, beautified=true) {
        const id = Object.keys(this.sorted.LoadingScreens).find(c => c.toLowerCase() === LSID.toLowerCase());
        if(!this.sorted.LoadingScreens[id]) return null;

        const { [id]: { exports, imported_packages, export_type, _path } } = this.sorted.LoadingScreens;

        const LoadingScreen = exports[0];
        const Set = LoadingScreen.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSetObject(LoadingScreen) : null;
        const Series = LoadingScreen.Series ? this.getSeries(LoadingScreen.Series.import) : null;

       return !beautified ? {
            ...LoadingScreen,
            Series,
            Set
        } : {
            ...this.getItemDefaultData(LoadingScreen),
            id,
            definition: {
                loadingscreen: _path
            },
            type: {
                display: 'Loading Screen',
                value: 'loading screen',
                definition: export_type
            }
        };
    }

    /**
     * Get Contrail by ID.
     * 
     * (Not case sensitive)
     * 
     * @param TID The ID of a Contrail.
     * @param beautified If the returned json looks good or not.
     * @returns Object
     */
    getContrail(TID, beautified=true) {
        const id = Object.keys(this.sorted.Contrails).find(c => c.toLowerCase() === TID.toLowerCase());
        if(!this.sorted.Contrails[id]) return null;

        const { [id]: { exports, imported_packages, _path } } = this.sorted.Contrails;

        const Contrail = exports[0];
        const Set = Contrail.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSetObject(Contrail) : null;
        const Series = Contrail.Series ? this.getSeries(Contrail.Series.import) : null;

       return !beautified ? {
            ...Contrail,
            Series,
            Set
        } : {
            ...this.getItemDefaultData(Contrail),
            id,
            definition: {
                contrail: _path
            }
        };
    }

    /**
     * Returns data about a Character.
     * 
     * (Not case sensitive)
     * 
     * @param {String} CID ID of a Character.
     * @param {Boolean} beautified If the returned data is beautified or not.
     * @returns Object
     */
    getCharacter(CID, beautified=true) {
        const id = Object.keys(this.sorted.Characters).find(c => c.toLowerCase() === CID.toLowerCase());
        if(!this.sorted.Characters[id]) return null;

        const { [id]: { exports, imported_packages, _path } } = this.sorted.Characters;

        const Character = exports[0];
        const Hero = Object.keys(this.sorted.Heroes).find(h => this.sorted.Heroes[h].exports[0].export_index === Character.HeroDefinition.import);
        const HeroDefinition = this.sorted.Heroes[Hero].exports[0];
        const Set = Character.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSetObject(Character) : null;

        const Specializations = this.sorted.Specializations[Object.keys(this.sorted.Specializations).find(s => s === HeroDefinition.Specializations[0].asset_path_name.split('/').pop().split('.')[0])].exports[0];
        const Meshes = [];
        const Parts = [];

        const Series = Character.Series ? this.getSeries(Character.Series.import) : null;

        Specializations.CharacterParts.forEach((part) => {
            const json = this.getJSON(this.replaceStringName(part.asset_path_name));
            if(json) {
                const path = this.replaceStringName(json.exports[1].SkeletalMesh.asset_path_name);

                if(json.exports) json.exports.forEach((exporte) => {
                    const { MaterialOverrides } = exporte;

                    if(!MaterialOverrides) return;

                    const { OverrideMaterial: { asset_path_name } } = MaterialOverrides[0];
                    const { TextureParameterValues } = this.getJSON(this.replaceStringName(asset_path_name).replace(/FortniteGame\/Content\//g, '')).exports[0];

                });
                
                if(json.exports) Meshes.push(json.exports);
                Parts.push(path);
            }
        });

        return !beautified ? {
            ...Character,
            HeroDefinition,
            Specializations,
            Parts,
            Meshes,
            Series,
            Set
        } : {
            ...this.getItemDefaultData(Character),
            id,
            parts: {
                body: Parts[0],
                head: Parts[1]
            },
            definition: {
                hero: `FortniteGame/Content/Athena/Heroes/${Hero}.uasset`,
                character: _path
            }
        };
    }

    /**
     * Returns images.
     * 
     * @param O A type of Object.
     * @returns {Object}
     */
    getImages(O) {
        return {
            small: O.SmallPreviewImage ? this.replaceStringName(O.SmallPreviewImage.asset_path_name) : null,
            hudAmmoSmallPreview: O.HUDAmmoSmallPreviewImage ? this.replaceStringName(O.HUDAmmoSmallPreviewImage.asset_path_name) : null,
            large: O.LargePreviewImage ? this.replaceStringName(O.LargePreviewImage.asset_path_name) : null,
            displayAsset: O.DisplayAssetPath ? this.replaceStringName(O.DisplayAssetPath.asset_path_name) : null,
            decal: O.DecalTexture ? O.DecalTexture.asset_path_name : null,
            background: O.BackgroundImage ? this.replaceStringName(O.BackgroundImage.asset_path_name) : null,
            cover: O.CoverArtImage ? this.replaceStringName(O.CoverArtImage.asset_path_name) : null,
            toast: O.ToastIcon ? this.replaceStringName(O.ToastIcon.asset_path_name) : null,
            entryList: O.EntryListIcon ? this.replaceStringName(O.EntryListIcon.asset_path_name) : null,
            sidePanelIcon: O.SidePanelIcon ? this.replaceStringName(O.SidePanelIcon.asset_path_name) : null
        }
    }

    /**
     * Normal information like the name of the item.
     * 
     * (Not case sensitive)
     * 
     * @param Item Object of a Athena item.
     * @returns {Object}
     */
    getItemDefaultData(Item, hideExtra) {
        const Series = Item.Series ? this.getSeries(Item.Series.import) : null;
        const Set = Item.GameplayTags ? Item.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.')) ? this.getSet(Item) : null : null;
        const ShortDescription = Item.ShortDescription || Item.Description;

        return {
            images: this.getImages(Item),
            description: Item.Description ? Item.Description.string.trim() : null,
            gameplayTags: Item.GameplayTags ? Item.GameplayTags.gameplay_tags : null,
            ...hideExtra ? {
                type: Item.export_type
            } : {
                type: {
                    display: ShortDescription.string,
                    value: ShortDescription ? ShortDescription.string.toLowerCase() : null,
                    shop: Item.GameplayTags ? Item.GameplayTags.gameplay_tags.includes('Cosmetics.Source.ItemShop') : null,
                },
                rarity: {
                    display: Item.Rarity,
                    value: Item.Rarity ? Item.Rarity.toLowerCase() : null,
                    backend: `EFortRarity::${Item.Rarity}`,
                    definition: Item.export_type
                },
                set: Set,
                series: Series,
                name: Item.DisplayName.string
            }
        }
    }

    /**
     * Get set information from a item.
     * 
     * @param Item Athena item export.
     * @returns {Object}
     */
    getSet(Item) {
        const Set = this.getSetObject(Item);

        return {
            name: Set.DisplayName.string,
            namespace: Set.DisplayName.string.namespace,
            tag: Set.Tag.TagName,
            description: Set.Description.string
        };
    }

    /**
     * Get raw information about a item's set.
     * 
     * @param Item An athena item export.
     */
    getSetObject(Item) {
        return this.sorted.Meta.CosmeticSets.exports[0][Item.GameplayTags.gameplay_tags.find(tag => tag.includes('Cosmetics.Set.'))];
    }

    /**
     * Get series information.
     * 
     * @param {String} import_index The import number from a Athena item object.
     * @returns {Object}
     */
    getSeries(import_index) {
        const Series = this.getSeriesObject(import_index);

        if(!Series) return null;

        return {
            background: Series.exports[0].BackgroundTexture ? this.replaceStringName(Series.exports[0].BackgroundTexture.asset_path_name) : null,
            card: Series.exports[0].ItemCardMaterial ? this.replaceStringName(Series.exports[0].ItemCardMaterial.asset_path_name) : null,
            material: Series.exports[0].BackgroundMaterial ? this.replaceStringName(Series.exports[0].BackgroundMaterial.asset_path_name) : null,
            name: Series.exports[0].DisplayName.string,
            colors: Series.exports[0].Colors
        }
    }

    /**
     * Get series object.
     * 
     * @param {String} import_index The import number from a Athena item object.
     */
    getSeriesObject(import_index) {
        return this.sorted.Series[Object.keys(this.sorted.Series).find(s => this.sorted.Series[s].exports[0].export_index === import_index)];
    }

    /**
     * Replaces and adds needed strings.
     * 
     * @param {String} name String.
     */
    replaceStringName(name) {
        return name.split('.')[0].replace('/Game', 'FortniteGame/Content') + '.uasset';
    }

    /**
     * Searches through all extractors and try to find the file and extract the JSON.
     * 
     * @returns Object
     */
    getJSON(file, extractor) {
        let json = null;

        Object.keys(this.extractors).map(e => this.extractors[e]).forEach((extractorr) => {
            if(extractor) extractorr = extractor;
            try {
                const Pak = new Package(extractorr.get_file(file));
                json._path = file;
                json = Pak.get_data();
            } catch(err) {
                /* console.log(err); */
            }
        });

        return json;
    }

    /**
     * Get AES Key for a package.
     * 
     * @param {String} pak Package name.
     */
    getKey(pak) {
        return this.dynamicKeys[pak];
    }

    /**
     * Asynchronous forEach function using *while*.
     * 
     * @param {(Object|Array)} array To be looped.
     * @param {Function} func Function on each element.
     * @param {Boolean} keys If param *array* is a Object.
     */
    async whiler(array, func, keys=false) {
        let length = keys ? Object.keys(array).length : array.length;
        
        while(length--) await func(keys ? Object.keys(array)[length] : array[length], length);
      
        return true;
    }

    /**
     * All files in all extractors.
     * 
     * @returns Array
     */
    get files() {
        const files = [];

        Object.keys(this.extractors).map(e => files.push(...this.extractors[e].get_file_list()));

        return files.filter(f => f && f !== '');
    }

    /**
     * All dynamicKeys with names.
     * 
     * @returns Object
     */
    get dynamicKeys() {
        const { dynamicKeys } = this.chain;

        const keys = {};

        Object.keys(dynamicKeys).forEach((key) => {
            keys[key.split('/').pop().split('.')[0]] = dynamicKeys[key];
        });

        return keys;
    }
}